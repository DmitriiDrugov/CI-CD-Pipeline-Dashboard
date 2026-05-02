const GITHUB_API = 'https://api.github.com';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface GitHubResult<T> {
  data: T | null;
  error: string | null;
  status: number;
  isRateLimited: boolean;
}

async function githubFetch<T>(path: string): Promise<GitHubResult<T>> {
  const url = `${GITHUB_API}${path}`;
  let response: Response;

  try {
    response = await fetch(url, { headers: getHeaders() });
  } catch {
    return { data: null, error: 'Network error reaching GitHub API', status: 0, isRateLimited: false };
  }

  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');

  if (response.status === 429 || (response.status === 403 && rateLimitRemaining === '0')) {
    return { data: null, error: 'GitHub API rate limit exceeded', status: 429, isRateLimited: true };
  }

  if (!response.ok) {
    const errorMessages: Record<number, string> = {
      401: 'GitHub API authentication failed — check GITHUB_TOKEN',
      403: 'GitHub API access forbidden',
      404: 'Resource not found on GitHub',
    };
    return {
      data: null,
      error: errorMessages[response.status] ?? `GitHub API error: ${response.status}`,
      status: response.status,
      isRateLimited: false,
    };
  }

  const data = (await response.json()) as T;
  return { data, error: null, status: response.status, isRateLimited: false };
}

export interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

export interface RawWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  run_started_at: string;
  updated_at: string;
}

export interface RawJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface RawWorkflowRunsPage {
  workflow_runs: RawWorkflowRun[];
  total_count: number;
}

export interface RawJobsPage {
  jobs: RawJob[];
}

export function fetchUserRepos(username: string): Promise<GitHubResult<RawRepo[]>> {
  return githubFetch<RawRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=public`
  );
}

export function fetchWorkflowRuns(
  owner: string,
  repo: string
): Promise<GitHubResult<RawWorkflowRunsPage>> {
  return githubFetch<RawWorkflowRunsPage>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=30`
  );
}

export function fetchJobsForRun(
  owner: string,
  repo: string,
  runId: number
): Promise<GitHubResult<RawJobsPage>> {
  return githubFetch<RawJobsPage>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/jobs`
  );
}
