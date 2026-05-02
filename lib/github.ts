const GITHUB_API = 'https://api.github.com';

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface GitHubAPIResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function fetchGitHubAPI<T>(path: string): Promise<GitHubAPIResult<T>> {
  const url = `${GITHUB_API}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 0 },
    });
  } catch {
    return { data: null, error: 'Network error reaching GitHub API.', status: 0 };
  }

  if (!response.ok) {
    if (response.status === 403) {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining === '0') {
        return {
          data: null,
          error: 'GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env.local for higher limits (5000 req/hr).',
          status: 403,
        };
      }
      return { data: null, error: 'GitHub API access forbidden.', status: 403 };
    }
    if (response.status === 404) {
      return { data: null, error: 'Not found on GitHub.', status: 404 };
    }
    return { data: null, error: `GitHub API error: ${response.status}`, status: response.status };
  }

  const data = (await response.json()) as T;
  return { data, error: null, status: response.status };
}
