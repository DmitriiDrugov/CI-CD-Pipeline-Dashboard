import type { RawRepo, RawWorkflowRun, RawJob } from './githubClient';

export interface LastRunSummary {
  status: string;
  conclusion: string | null;
  head_branch: string;
  created_at: string;
}

export interface RepoWorkflowStat {
  id: number;
  repo: string;
  owner: string;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  avatar_url: string;
  successRate: number;
  avgDuration: number;
  mostFailingJob: string | null;
  totalRuns: number;
  hasWorkflows: boolean;
  lastRun: LastRunSummary | null;
}

export interface WorkflowStatsResponse {
  username: string;
  repos: RepoWorkflowStat[];
  generatedAt: string;
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

export function aggregateRunsForRepo(
  repo: RawRepo,
  runs: RawWorkflowRun[],
  jobsByRunId: Map<number, RawJob[]>
): RepoWorkflowStat {
  const meta = repoMeta(repo);

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

  const completedRuns = runs.filter((r) => r.status === 'completed');
  const successfulRuns = completedRuns.filter((r) => r.conclusion === 'success');
  const successRate =
    completedRuns.length > 0
      ? Math.round((successfulRuns.length / completedRuns.length) * 100)
      : 0;

  const durations = runs
    .map((r) => calcDuration(r.run_started_at, r.updated_at))
    .filter((d) => d > 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const jobFailureCounts = new Map<string, number>();
  for (const jobs of jobsByRunId.values()) {
    for (const job of jobs) {
      if (job.conclusion === 'failure') {
        jobFailureCounts.set(job.name, (jobFailureCounts.get(job.name) ?? 0) + 1);
      }
    }
  }

  let mostFailingJob: string | null = null;
  let maxFailures = 0;
  for (const [name, count] of jobFailureCounts) {
    if (count > maxFailures) {
      maxFailures = count;
      mostFailingJob = name;
    }
  }

  const latest = runs[0]!;
  const lastRun: LastRunSummary = {
    status: latest.status,
    conclusion: latest.conclusion,
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
