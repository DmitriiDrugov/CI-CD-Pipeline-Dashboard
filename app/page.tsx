'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubRepo, RepoStats, FilterMode, WorkflowsResponse } from '@/lib/types';
import { RepoCard } from '@/components/RepoCard';
import { RepoCardSkeleton } from '@/components/RepoCardSkeleton';
import { HealthOverview } from '@/components/HealthOverview';
import { FilterBar } from '@/components/FilterBar';

const REFRESH_MS = 30_000;
const BATCH = 5;

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const [input, setInput] = useState('');
  const [activeUser, setActiveUser] = useState('');
  const [repoStats, setRepoStats] = useState<RepoStats[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async (username: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const { signal } = ctrl;

    setFetchingRepos(true);
    setError(null);

    try {
      const res = await fetch(`/api/repos?username=${encodeURIComponent(username)}`, { signal });
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const repos = (await res.json()) as GitHubRepo[];
      if (signal.aborted) return;

      if (repos.length === 0) {
        setRepoStats([]);
        setFetchingRepos(false);
        setLastRefresh(new Date());
        return;
      }

      const seed: RepoStats[] = repos.map((repo) => ({
        repo,
        lastRun: null,
        successRate: 0,
        avgDuration: 0,
        totalRuns: 0,
        hasWorkflows: false,
        workflowsLoading: true,
      }));
      setRepoStats(seed);
      setFetchingRepos(false);

      const results = [...seed];

      for (let i = 0; i < repos.length; i += BATCH) {
        if (signal.aborted) break;
        const batch = repos.slice(i, i + BATCH);

        const settled = await Promise.allSettled(
          batch.map(async (repo) => {
            const r = await fetch(
              `/api/workflows?owner=${encodeURIComponent(repo.owner.login)}&repo=${encodeURIComponent(repo.name)}`,
              { signal }
            );
            if (!r.ok) return null;
            return { repo, wf: (await r.json()) as WorkflowsResponse };
          })
        );

        if (signal.aborted) break;

        settled.forEach((result, j) => {
          const idx = i + j;
          if (result.status === 'fulfilled' && result.value) {
            const { repo, wf } = result.value;
            results[idx] = {
              repo,
              lastRun: wf.lastRun,
              successRate: wf.successRate,
              avgDuration: wf.avgDuration,
              totalRuns: wf.totalRuns,
              hasWorkflows: wf.hasWorkflows,
              workflowsLoading: false,
            };
          } else if (results[idx]) {
            results[idx] = { ...results[idx]!, workflowsLoading: false };
          }
        });

        setRepoStats([...results]);
      }

      setLastRefresh(new Date());
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      setFetchingRepos(false);
    }
  }, []);

  useEffect(() => {
    if (!activeUser) return;
    const id = setInterval(() => fetchAll(activeUser), REFRESH_MS);
    return () => clearInterval(id);
  }, [activeUser, fetchAll]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = input.trim();
    if (!user) return;
    setFilter('all');
    setActiveUser(user);
    fetchAll(user);
  }

  const filtered = repoStats.filter((s) => {
    if (filter === 'passing') return s.lastRun?.conclusion === 'success';
    if (filter === 'failing') return s.lastRun?.conclusion === 'failure';
    return true;
  });

  const counts = {
    all: repoStats.length,
    passing: repoStats.filter((s) => s.lastRun?.conclusion === 'success').length,
    failing: repoStats.filter((s) => s.lastRun?.conclusion === 'failure').length,
  };

  const showContent = repoStats.length > 0 || fetchingRepos;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gradient mb-2">
          Pipeline Monitor
        </h1>
        <p className="text-sm text-white/35">
          Real-time GitHub Actions health across your repositories
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="GitHub username"
              className="w-full bg-bg-raised border border-white/6 hover:border-white/10 focus:border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none transition-colors font-mono text-sm"
              disabled={fetchingRepos}
            />
          </div>
          <button
            type="submit"
            disabled={fetchingRepos || !input.trim()}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-400 text-white shadow-glow-indigo flex-shrink-0"
          >
            {fetchingRepos ? 'Loading…' : 'Load'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 mb-6 text-sm">
          <span className="text-red-500 mt-0.5 flex-shrink-0">⚠</span>
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Content */}
      {showContent && (
        <>
          {repoStats.length > 0 && <HealthOverview repoStats={repoStats} />}

          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <FilterBar active={filter} onChange={setFilter} counts={counts} />
            {lastRefresh && (
              <span className="text-xs text-white/20 font-mono flex-shrink-0">
                ↻ {lastRefresh.toLocaleTimeString()} · 30s refresh
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fetchingRepos && repoStats.length === 0
              ? Array.from({ length: 9 }).map((_, i) => <RepoCardSkeleton key={i} />)
              : filtered.map((s) => <RepoCard key={s.repo.id} stats={s} />)}
          </div>

          {filtered.length === 0 && !fetchingRepos && repoStats.length > 0 && (
            <div className="py-20 text-center text-white/25 text-sm">
              No repos match &ldquo;{filter}&rdquo;
            </div>
          )}
        </>
      )}

      {/* Idle states */}
      {!showContent && !error && activeUser && (
        <div className="py-24 text-center text-white/25 text-sm">
          No public repositories found for{' '}
          <span className="font-mono text-white/40">{activeUser}</span>
        </div>
      )}

      {!showContent && !error && !activeUser && (
        <div className="py-32 text-center text-white/20 text-sm space-y-2">
          <p className="text-4xl mb-4">⌥</p>
          <p>Enter a GitHub username to start monitoring pipelines</p>
        </div>
      )}
    </div>
  );
}
