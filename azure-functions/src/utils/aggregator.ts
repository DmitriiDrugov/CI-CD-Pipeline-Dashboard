import type { RawWorkflowRun, RawJob } from './githubClient';

export interface RepoWorkflowStat {
  repo: string;
  owner: string;
  name: string;
  successRate: number;
  avgDuration: number;
  mostFailingJob: string | null;
  totalRuns: number;
  hasWorkflows: boolean;
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

export function aggregateRunsForRepo(
  owner: string,
  repoName: string,
  runs: RawWorkflowRun[],
  jobsByRunId: Map<number, RawJob[]>
): RepoWorkflowStat {
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

  // Count failures per job name across all fetched run jobs
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
