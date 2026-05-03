/**
 * GET /api/workflow-stats?username=<github_username>
 *
 * Returns per-repo workflow aggregations for all public repositories of the user.
 *
 * Backend selection:
 *   USE_AZURE_BACKEND=true  → proxies to AZURE_FUNCTION_URL
 *   USE_AZURE_BACKEND=false → computes locally via the GitHub API
 *
 * Adds an `X-Backend` header so the client can tell which path served the request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubAPI } from '@/lib/github';
import type {
  AggregatedLastRun,
  RepoWorkflowStat,
  WorkflowStatsAggregated,
} from '@/lib/types';

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  owner: { login: string; avatar_url: string };
}

interface RawRun {
  id: number;
  status: string;
  conclusion: string | null;
  head_branch: string;
  run_started_at: string;
  updated_at: string;
  created_at: string;
}

interface RawJob {
  name: string;
  conclusion: string | null;
}

function calcDuration(startedAt: string, completedAt: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

function repoMeta(repo: RawRepo) {
  return {
    id: repo.id,
    repo: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    description: repo.description,
    html_url: repo.html_url,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    updated_at: repo.updated_at,
    avatar_url: repo.owner.avatar_url,
  };
}

async function aggregateRepo(repo: RawRepo): Promise<RepoWorkflowStat> {
  const meta = repoMeta(repo);

  const runsResult = await fetchGitHubAPI<{ workflow_runs: RawRun[] }>(
    `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/actions/runs?per_page=30`
  );

  const runs = runsResult.data?.workflow_runs ?? [];

  if (runs.length === 0) {
    return {
      ...meta,
      successRate: 0,
      avgDuration: 0,
      mostFailingJob: null,
      totalRuns: 0,
      hasWorkflows: false,
      lastRun: null,
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

  const jobFailureCounts = new Map<string, number>();
  await Promise.allSettled(
    runs.slice(0, 5).map(async (run) => {
      const jobsResult = await fetchGitHubAPI<{ jobs: RawJob[] }>(
        `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/actions/runs/${run.id}/jobs`
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
  jobFailureCounts.forEach((count, name) => {
    if (count > maxFailures) {
      maxFailures = count;
      mostFailingJob = name;
    }
  });

  const latest = runs[0]!;
  const lastRun: AggregatedLastRun = {
    status: latest.status,
    conclusion: latest.conclusion as AggregatedLastRun['conclusion'],
    head_branch: latest.head_branch,
    created_at: latest.created_at,
  };

  return {
    ...meta,
    successRate,
    avgDuration,
    mostFailingJob,
    totalRuns: runs.length,
    hasWorkflows: true,
    lastRun,
  };
}

async function handleLocal(username: string): Promise<NextResponse> {
  const reposResult = await fetchGitHubAPI<RawRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=public`
  );

  if (reposResult.error) {
    return NextResponse.json(
      { error: reposResult.error },
      { status: reposResult.status || 500, headers: { 'X-Backend': 'local' } }
    );
  }

  const repos = reposResult.data ?? [];
  const repoStats: RepoWorkflowStat[] = [];

  const BATCH = 5;
  for (let i = 0; i < repos.length; i += BATCH) {
    const settled = await Promise.allSettled(
      repos.slice(i, i + BATCH).map((r) => aggregateRepo(r))
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
  return NextResponse.json(body, { headers: { 'X-Backend': 'local' } });
}

async function handleAzure(username: string): Promise<NextResponse> {
  const azureUrl = process.env.AZURE_FUNCTION_URL;
  if (!azureUrl) {
    return NextResponse.json(
      { error: 'AZURE_FUNCTION_URL is not set — cannot proxy to Azure backend' },
      { status: 500, headers: { 'X-Backend': 'azure-misconfigured' } }
    );
  }

  const target = `${azureUrl.replace(/\/$/, '')}/api/getWorkflowStats?username=${encodeURIComponent(username)}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, { next: { revalidate: 0 } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach Azure Function — check AZURE_FUNCTION_URL' },
      { status: 502, headers: { 'X-Backend': 'azure-unreachable' } }
    );
  }

  const data: unknown = await upstream.json();
  return NextResponse.json(data, {
    status: upstream.status,
    headers: { 'X-Backend': 'azure' },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  const useAzure = process.env.USE_AZURE_BACKEND === 'true';
  return useAzure ? handleAzure(username) : handleLocal(username);
}
