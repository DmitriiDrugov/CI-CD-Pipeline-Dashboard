export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  language: string | null;
  stargazers_count: number;
}

export type RunStatus = 'queued' | 'in_progress' | 'completed' | 'waiting';
export type RunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'neutral'
  | 'stale'
  | null;

export interface WorkflowRun {
  id: number;
  run_number: number;
  name: string;
  head_branch: string;
  head_sha: string;
  head_commit: { message: string };
  status: RunStatus;
  conclusion: RunConclusion;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
  durationSeconds: number;
}

export interface DailyStat {
  date: string;
  success: number;
  failure: number;
  total: number;
}

export interface JobStat {
  name: string;
  avgDuration: number;
  successRate: number;
  totalRuns: number;
  failures: number;
}

export interface RepoStats {
  repo: GitHubRepo;
  lastRun: WorkflowRun | null;
  successRate: number;
  avgDuration: number;
  totalRuns: number;
  hasWorkflows: boolean;
  workflowsLoading: boolean;
}

export interface WorkflowsResponse {
  runs: WorkflowRun[];
  successRate: number;
  avgDuration: number;
  totalRuns: number;
  lastRun: WorkflowRun | null;
  dailyStats: DailyStat[];
  jobStats: JobStat[];
  mostFailingJob: string | null;
  hasWorkflows: boolean;
}

export type FilterMode = 'all' | 'passing' | 'failing';

// Aggregated per-repo stats returned by the Azure Function (and the local fallback route).
export interface AggregatedLastRun {
  status: RunStatus | string;
  conclusion: RunConclusion;
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
  lastRun: AggregatedLastRun | null;
}

export interface WorkflowStatsAggregated {
  username: string;
  repos: RepoWorkflowStat[];
  generatedAt: string;
}
