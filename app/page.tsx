'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubRepo, RepoStats, FilterMode, WorkflowsResponse } from '@/lib/types';
import { RepoCard } from '@/components/RepoCard';
import { RepoCardSkeleton } from '@/components/RepoCardSkeleton';
import { HealthOverview } from '@/components/HealthOverview';
import { FilterBar } from '@/components/FilterBar';

const REFRESH_INTERVAL_MS = 30_000;
const WORKFLOW_BATCH_SIZE = 5;

export default function HomePage() {
  const [inputValue, setInputValue] = useState('');
  const [activeUsername, setActiveUsername] = useState('');
  const [repoStats, setRepoStats] = useState<RepoStats[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAllData = useCallback(async (username: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setFetchingRepos(true);
    setError(null);

    try {
      const res = await fetch(`/api/repos?username=${encodeURIComponent(username)}`, { signal });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Failed to fetch repos (${res.status})`);
      }
      const repos = (await res.json()) as GitHubRepo[];

      if (signal.aborted) return;

      if (repos.length === 0) {
        setRepoStats([]);
        setFetchingRepos(false);
        setLastRefresh(new Date());
        return;
      }

      // Seed cards immediately so the UI shows skeletons per-card
      const seedStats: RepoStats[] = repos.map((repo) => ({
        repo,
        lastRun: null,
        successRate: 0,
        avgDuration: 0,
        totalRuns: 0,
        hasWorkflows: false,
        workflowsLoading: true,
      }));
      setRepoStats(seedStats);
      setFetchingRepos(false);

      // Fetch workflow stats in batches
      const results = [...seedStats];
      for (let i = 0; i < repos.length; i += WORKFLOW_BATCH_SIZE) {
        if (signal.aborted) break;
        const batch = repos.slice(i, i + WORKFLOW_BATCH_SIZE);

        const settled = await Promise.allSettled(
          batch.map(async (repo) => {
            const wfRes = await fetch(
              `/api/workflows?owner=${encodeURIComponent(repo.owner.login)}&repo=${encodeURIComponent(repo.name)}`,
              { signal }
            );
            if (!wfRes.ok) return null;
            return { repo, wfData: (await wfRes.json()) as WorkflowsResponse };
          })
        );

        if (signal.aborted) break;

        settled.forEach((result, j) => {
          const idx = i + j;
          if (result.status === 'fulfilled' && result.value) {
            const { repo, wfData } = result.value;
            results[idx] = {
              repo,
              lastRun: wfData.lastRun,
              successRate: wfData.successRate,
              avgDuration: wfData.avgDuration,
              totalRuns: wfData.totalRuns,
              hasWorkflows: wfData.hasWorkflows,
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
      setError((err as Error).message ?? 'An unexpected error occurred.');
      setFetchingRepos(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!activeUsername) return;
    const id = setInterval(() => fetchAllData(activeUsername), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeUsername, fetchAllData]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = inputValue.trim();
    if (!user) return;
    setFilter('all');
    setActiveUsername(user);
    fetchAllData(user);
  }

  const filteredRepos = repoStats.filter((s) => {
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
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Pipeline Dashboard</h1>
        <p className="text-gray-600 text-sm mt-1">
          Monitor GitHub Actions across your public repositories
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="GitHub username..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 font-mono text-sm transition-colors"
            disabled={fetchingRepos}
          />
          <button
            type="submit"
            disabled={fetchingRepos || !inputValue.trim()}
            className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {fetchingRepos ? 'Loading…' : 'Load Repos'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Main content */}
      {showContent && (
        <>
          {repoStats.length > 0 && <HealthOverview repoStats={repoStats} />}

          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <FilterBar active={filter} onChange={setFilter} counts={counts} />
            {lastRefresh && (
              <span className="text-gray-700 text-xs font-mono flex-shrink-0">
                refreshed {lastRefresh.toLocaleTimeString()} · auto-refresh 30s
              </span>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fetchingRepos && repoStats.length === 0
              ? Array.from({ length: 9 }).map((_, i) => <RepoCardSkeleton key={i} />)
              : filteredRepos.map((stats) => <RepoCard key={stats.repo.id} stats={stats} />)}
          </div>

          {filteredRepos.length === 0 && !fetchingRepos && repoStats.length > 0 && (
            <p className="text-gray-600 text-sm text-center py-12">
              No repos match the &quot;{filter}&quot; filter.
            </p>
          )}
        </>
      )}

      {/* Empty / idle states */}
      {!showContent && !error && activeUsername && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-sm">
            No public repositories found for{' '}
            <span className="font-mono text-gray-500">{activeUsername}</span>.
          </p>
        </div>
      )}

      {!showContent && !error && !activeUsername && (
        <div className="text-center py-24 text-gray-700">
          <p className="text-sm">Enter a GitHub username above to get started.</p>
        </div>
      )}
    </div>
  );
}
