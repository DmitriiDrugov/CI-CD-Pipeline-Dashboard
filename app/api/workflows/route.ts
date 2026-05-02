import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubAPI } from '@/lib/github';
import type { WorkflowRun, WorkflowsResponse, DailyStat, JobStat, RunStatus, RunConclusion } from '@/lib/types';

interface RawRun {
  id: number;
  run_number: number;
  name: string;
  head_branch: string;
  head_sha: string;
  head_commit: { message: string };
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
}

interface GitHubRunsResponse {
  workflow_runs: RawRun[];
  total_count: number;
}

interface GitHubJobsResponse {
  jobs: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    started_at: string;
    completed_at: string | null;
  }>;
}

function calcDuration(startedAt: string, completedAt: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const detail = searchParams.get('detail') === 'true';

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
  }

  const runsResult = await fetchGitHubAPI<GitHubRunsResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=30`
  );

  if (runsResult.error) {
    return NextResponse.json({ error: runsResult.error }, { status: runsResult.status || 500 });
  }

  const rawRuns = runsResult.data?.workflow_runs ?? [];

  if (rawRuns.length === 0) {
    const response: WorkflowsResponse = {
      runs: [],
      successRate: 0,
      avgDuration: 0,
      totalRuns: 0,
      lastRun: null,
      dailyStats: buildEmptyDailyStats(),
      jobStats: [],
      mostFailingJob: null,
      hasWorkflows: false,
    };
    return NextResponse.json(response);
  }

  const runs: WorkflowRun[] = rawRuns.map((run) => ({
    id: run.id,
    run_number: run.run_number,
    name: run.name,
    head_branch: run.head_branch,
    head_sha: run.head_sha,
    head_commit: run.head_commit,
    status: run.status as RunStatus,
    conclusion: run.conclusion as RunConclusion,
    created_at: run.created_at,
    updated_at: run.updated_at,
    run_started_at: run.run_started_at,
    html_url: run.html_url,
    durationSeconds: calcDuration(run.run_started_at, run.updated_at),
  }));

  const completedRuns = runs.filter((r) => r.status === 'completed');
  const successfulRuns = completedRuns.filter((r) => r.conclusion === 'success');
  const successRate =
    completedRuns.length > 0
      ? Math.round((successfulRuns.length / completedRuns.length) * 100)
      : 0;

  const runsWithDuration = runs.filter((r) => r.durationSeconds > 0);
  const avgDuration =
    runsWithDuration.length > 0
      ? Math.round(
          runsWithDuration.reduce((sum, r) => sum + r.durationSeconds, 0) / runsWithDuration.length
        )
      : 0;

  const dailyStats = buildDailyStats(runs);

  let jobStats: JobStat[] = [];
  let mostFailingJob: string | null = null;

  if (detail) {
    // Fetch jobs for last 10 runs (to limit API calls)
    const runsToFetch = runs.slice(0, 10);
    const jobMap = new Map<string, { durations: number[]; failures: number; total: number }>();

    await Promise.allSettled(
      runsToFetch.map(async (run) => {
        const jobsResult = await fetchGitHubAPI<GitHubJobsResponse>(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${run.id}/jobs`
        );
        if (!jobsResult.data) return;

        for (const job of jobsResult.data.jobs) {
          if (!job.completed_at || !job.started_at) continue;
          const duration = calcDuration(job.started_at, job.completed_at);
          if (!jobMap.has(job.name)) {
            jobMap.set(job.name, { durations: [], failures: 0, total: 0 });
          }
          const stat = jobMap.get(job.name)!;
          stat.total++;
          stat.durations.push(duration);
          if (job.conclusion === 'failure') stat.failures++;
        }
      })
    );

    jobStats = Array.from(jobMap.entries())
      .map(([name, stat]) => ({
        name,
        avgDuration:
          stat.durations.length > 0
            ? Math.round(stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length)
            : 0,
        successRate:
          stat.total > 0 ? Math.round(((stat.total - stat.failures) / stat.total) * 100) : 0,
        totalRuns: stat.total,
        failures: stat.failures,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    if (jobStats.length > 0) {
      const maxFailures = Math.max(...jobStats.map((j) => j.failures));
      if (maxFailures > 0) {
        mostFailingJob = jobStats.find((j) => j.failures === maxFailures)?.name ?? null;
      }
    }
  }

  const response: WorkflowsResponse = {
    runs: runs.slice(0, 20),
    successRate,
    avgDuration,
    totalRuns: runs.length,
    lastRun: runs[0] ?? null,
    dailyStats,
    jobStats,
    mostFailingJob,
    hasWorkflows: true,
  };

  return NextResponse.json(response);
}

function buildEmptyDailyStats(): DailyStat[] {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return { date: date.toISOString().split('T')[0]!, success: 0, failure: 0, total: 0 };
  });
}

function buildDailyStats(runs: WorkflowRun[]): DailyStat[] {
  const dailyMap = new Map<string, { success: number; failure: number; total: number }>();

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0]!;
    dailyMap.set(key, { success: 0, failure: 0, total: 0 });
  }

  for (const run of runs) {
    const key = run.created_at.split('T')[0]!;
    if (dailyMap.has(key)) {
      const day = dailyMap.get(key)!;
      day.total++;
      if (run.conclusion === 'success') day.success++;
      else if (run.conclusion === 'failure') day.failure++;
    }
  }

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({ date, ...stats }));
}
