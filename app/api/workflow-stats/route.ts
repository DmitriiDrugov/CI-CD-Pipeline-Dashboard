/**
 * GET /api/workflow-stats?username=<github_username>
 *
 * Returns per-repo workflow aggregations (success rate, avg duration, most-failing job)
 * for all public repositories belonging to the given GitHub user.
 *
 * Backend selection is controlled by the USE_AZURE_BACKEND environment variable:
 *   USE_AZURE_BACKEND=true  → proxies the request to the Azure Function at AZURE_FUNCTION_URL
 *   USE_AZURE_BACKEND=false → computes the result locally using the GitHub API directly
 *
 * The GitHub token (GITHUB_TOKEN) is never forwarded to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubAPI } from '@/lib/github';
import type { RepoWorkflowStat, WorkflowStatsAggregated } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types matching the GitHub REST API responses we consume locally
// ---------------------------------------------------------------------------

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface RawRun {
  id: number;
  status: string;
  conclusion: string | null;
  run_started_at: string;
  updated_at: string;
}

interface RawJob {
  name: string;
  conclusion: string | null;
}

// ---------------------------------------------------------------------------
// Local aggregation helpers (mirrors azure-functions/src/utils/aggregator.ts)
// ---------------------------------------------------------------------------

function calcDuration(startedAt: string, completedAt: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

async function aggregateRepo(owner: string, repoName: string): Promise<RepoWorkflowStat> {
  const runsResult = await fetchGitHubAPI<{ workflow_runs: RawRun[] }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs?per_page=30`
  );

  const runs = runsResult.data?.workflow_runs ?? [];

  if (runs.length === 0) {
    return {
      repo: `${owner}/${repoName}`,
      owner,
      name: repoName,
      successRate: 0,
      avgDuration: 0,
      mostFailingJob: null,
      totalRuns: 0,
      hasWorkflows: false,
    };
  }

  const completed = runs.filter((r) => r.status === 'completed');
  const successful = completed.filter((r) => r.conclusion === 'success');
  const successRate =
    completed.length > 0 ? Math.round((successful.length / completed.length) * 100) : 0;

  const durations = runs
    .map((r) => calcDuration(r.run_started_at, r.updated_at))
    .filter((d) => d > 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  // Fetch jobs for the 5 most recent runs to identify the most-failing job.
  const jobFailureCounts = new Map<string, number>();
  await Promise.allSettled(
    runs.slice(0, 5).map(async (run) => {
      const jobsResult = await fetchGitHubAPI<{ jobs: RawJob[] }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs/${run.id}/jobs`
      );
      for (const job of jobsResult.data?.jobs ?? []) {
        if (job.conclusion === 'failure') {
          jobFailureCounts.set(job.name, (jobFailureCounts.get(job.name) ?? 0) + 1);
        }
      }
    })
  );

  let mostFailingJob: string | null = null;
  let maxFailures = 0;
  for (const [name, count] of jobFailureCounts) {
    if (count > maxFailures) {
      maxFailures = count;
      mostFailingJob = name;
    }
  }

  return {
    repo: `${owner}/${repoName}`,
    owner,
    name: repoName,
    successRate,
    avgDuration,
    mostFailingJob,
    totalRuns: runs.length,
    hasWorkflows: true,
  };
}

// ---------------------------------------------------------------------------
// Backend implementations
// ---------------------------------------------------------------------------

async function handleLocal(username: string): Promise<NextResponse> {
  const reposResult = await fetchGitHubAPI<RawRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=public`
  );

  if (reposResult.error) {
    return NextResponse.json({ error: reposResult.error }, { status: reposResult.status || 500 });
  }

  const repos = reposResult.data ?? [];
  const repoStats: RepoWorkflowStat[] = [];

  // Process in batches of 5 to avoid saturating the GitHub API.
  const BATCH = 5;
  for (let i = 0; i < repos.length; i += BATCH) {
    const settled = await Promise.allSettled(
      repos.slice(i, i + BATCH).map((r) => aggregateRepo(r.owner.login, r.name))
    );
    for (const result of settled) {
      if (result.status === 'fulfilled') repoStats.push(result.value);
    }
  }

  const body: WorkflowStatsAggregated = {
    username,
    repos: repoStats,
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(body);
}

async function handleAzure(username: string): Promise<NextResponse> {
  const azureUrl = process.env.AZURE_FUNCTION_URL;
  if (!azureUrl) {
    return NextResponse.json(
      { error: 'AZURE_FUNCTION_URL is not set — cannot proxy to Azure backend' },
      { status: 500 }
    );
  }

  const target = `${azureUrl.replace(/\/$/, '')}/api/getWorkflowStats?username=${encodeURIComponent(username)}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, { next: { revalidate: 0 } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach Azure Function — check AZURE_FUNCTION_URL' },
      { status: 502 }
    );
  }

  const data: unknown = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  const useAzure = process.env.USE_AZURE_BACKEND === 'true';
  return useAzure ? handleAzure(username) : handleLocal(username);
}
