import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as appInsights from 'applicationinsights';
import {
  fetchUserRepos,
  fetchWorkflowRuns,
  fetchJobsForRun,
  RawJob,
} from '../utils/githubClient';
import { aggregateRunsForRepo, WorkflowStatsResponse } from '../utils/aggregator';

// Initialize Application Insights once at cold-start; no-op if connection string absent.
let aiReady = false;

function getAiClient(): appInsights.TelemetryClient | null {
  const connStr = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connStr) return null;
  if (!aiReady) {
    appInsights
      .setup(connStr)
      // Azure Functions v4 already instruments HTTP — disable auto-collection to avoid
      // double-counting; we emit one trackRequest per invocation manually.
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .start();
    aiReady = true;
  }
  return appInsights.defaultClient;
}

// Process repos concurrently in small batches to stay within GitHub secondary rate limits.
const REPO_BATCH_SIZE = 5;
// Inspect jobs only for the most recent N runs per repo to limit API fan-out.
const RUNS_FOR_JOB_INSPECTION = 5;

async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startMs = Date.now();
  const ai = getAiClient();
  const username = request.query.get('username');

  if (!username) {
    return jsonResponse(400, { error: 'username query parameter is required' });
  }

  context.log(`getWorkflowStats: username=${username}`);

  try {
    const reposResult = await fetchUserRepos(username);

    if (reposResult.isRateLimited) {
      ai?.trackEvent({
        name: 'GitHubRateLimitHit',
        properties: { username, endpoint: 'repos' },
      });
      return rateLimitedResponse();
    }

    if (reposResult.error || !reposResult.data) {
      return jsonResponse(reposResult.status || 500, {
        error: reposResult.error ?? 'Failed to fetch repositories',
      });
    }

    const repos = reposResult.data;
    const repoStats = [];

    for (let i = 0; i < repos.length; i += REPO_BATCH_SIZE) {
      const batch = repos.slice(i, i + REPO_BATCH_SIZE);

      const settled = await Promise.allSettled(
        batch.map(async (repo) => {
          const runsResult = await fetchWorkflowRuns(repo.owner.login, repo.name);

          if (runsResult.isRateLimited) {
            ai?.trackEvent({
              name: 'GitHubRateLimitHit',
              properties: { username, endpoint: 'runs', repo: repo.full_name },
            });
            // Propagate so the outer settled handler can surface the error.
            throw Object.assign(new Error('rate_limited'), { isRateLimited: true });
          }

          const runs = runsResult.data?.workflow_runs ?? [];

          // Fetch jobs in parallel for the most recent runs only.
          const jobsByRunId = new Map<number, RawJob[]>();
          await Promise.allSettled(
            runs.slice(0, RUNS_FOR_JOB_INSPECTION).map(async (run) => {
              const jobsResult = await fetchJobsForRun(repo.owner.login, repo.name, run.id);
              if (jobsResult.data?.jobs) {
                jobsByRunId.set(run.id, jobsResult.data.jobs);
              }
            })
          );

          return aggregateRunsForRepo(repo.owner.login, repo.name, runs, jobsByRunId);
        })
      );

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          repoStats.push(result.value);
        } else {
          // Log individual repo failures; don't abort the entire request.
          const err = result.reason as Error & { isRateLimited?: boolean };
          context.warn(`Skipping repo in batch: ${err.message}`);
          if (err.isRateLimited) {
            // Stop processing further batches on rate limit to avoid hammering.
            break;
          }
        }
      }
    }

    const durationMs = Date.now() - startMs;

    ai?.trackRequest({
      name: 'GET getWorkflowStats',
      url: request.url,
      duration: durationMs,
      resultCode: '200',
      success: true,
      properties: {
        username,
        repoCount: String(repos.length),
        reposWithWorkflows: String(repoStats.filter((r) => r.hasWorkflows).length),
      },
    });

    const body: WorkflowStatsResponse = {
      username,
      repos: repoStats,
      generatedAt: new Date().toISOString(),
    };

    return jsonResponse(200, body);
  } catch (error) {
    const durationMs = Date.now() - startMs;
    const message = error instanceof Error ? error.message : 'Unknown error';

    context.error(`getWorkflowStats unhandled error: ${message}`);
    ai?.trackRequest({
      name: 'GET getWorkflowStats',
      url: request.url,
      duration: durationMs,
      resultCode: '500',
      success: false,
      properties: { username, error: message },
    });
    ai?.trackException({
      exception: error instanceof Error ? error : new Error(message),
    });

    return jsonResponse(500, { error: 'Internal server error' });
  }
}

function jsonResponse(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    jsonBody: body,
  };
}

function rateLimitedResponse(): HttpResponseInit {
  return {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60',
    },
    jsonBody: { error: 'GitHub API rate limit exceeded. Retry after 60 seconds.' },
  };
}

app.http('getWorkflowStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler,
});
