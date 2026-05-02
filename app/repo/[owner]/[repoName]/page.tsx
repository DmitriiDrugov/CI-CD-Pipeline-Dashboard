'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { WorkflowsResponse } from '@/lib/types';
import { StatusPill } from '@/components/StatusPill';
import { RunsTable } from '@/components/RunsTable';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues with Recharts
const WorkflowChart = dynamic(
  () => import('@/components/charts/WorkflowChart').then((m) => m.WorkflowChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const DurationChart = dynamic(
  () => import('@/components/charts/DurationChart').then((m) => m.DurationChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return <div className="h-[260px] bg-gray-800/40 rounded-lg animate-pulse" />;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function StatCard({
  label,
  value,
  valueClass = 'text-white',
  small = false,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-600 text-xs mb-2">{label}</p>
      <p className={`font-mono font-bold ${small ? 'text-sm break-all leading-snug' : 'text-2xl'} ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function RepoDetailPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repoName = params.repoName as string;

  const [data, setData] = useState<WorkflowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/workflows?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&detail=true`
        );
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const wfData = (await res.json()) as WorkflowsResponse;
        if (!cancelled) setData(wfData);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [owner, repoName]);

  const rateColor =
    !data
      ? ''
      : data.successRate > 80
        ? 'text-green-400'
        : data.successRate > 60
          ? 'text-yellow-400'
          : 'text-red-400';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6 text-sm" aria-label="Breadcrumb">
        <Link href="/" className="text-gray-600 hover:text-gray-300 transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-800">/</span>
        <span className="text-gray-500 font-mono">
          {owner}/{repoName}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">
            {owner}/<span className="text-gray-300">{repoName}</span>
          </h1>
          <a
            href={`https://github.com/${owner}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-400 text-sm transition-colors mt-2"
          >
            <GitHubIcon />
            View on GitHub
          </a>
        </div>

        {data?.lastRun && (
          <div className="flex flex-col items-end gap-1">
            <StatusPill status={data.lastRun.status} conclusion={data.lastRun.conclusion} size="md" />
            <p className="text-gray-700 text-xs font-mono">latest run</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
            <div className="h-72 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          </div>
          <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <>
          {!data.hasWorkflows ? (
            <div className="text-center py-20 text-gray-600">
              <p className="text-sm">No GitHub Actions workflows are configured for this repository.</p>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard
                  label="Success Rate"
                  value={`${data.successRate}%`}
                  valueClass={rateColor}
                />
                <StatCard label="Avg Duration" value={formatDuration(data.avgDuration)} />
                <StatCard label="Total Runs" value={data.totalRuns} />
                <StatCard
                  label="Most Failing Job"
                  value={data.mostFailingJob ?? 'N/A'}
                  small
                  valueClass={data.mostFailingJob ? 'text-red-400' : 'text-gray-500'}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h2 className="text-gray-300 text-sm font-semibold mb-4">
                    Runs per Day — last 30 days
                  </h2>
                  <WorkflowChart data={data.dailyStats} />
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h2 className="text-gray-300 text-sm font-semibold mb-4">
                    Avg Build Duration per Job
                  </h2>
                  {data.jobStats.length > 0 ? (
                    <DurationChart data={data.jobStats} />
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-gray-700 text-sm">
                      No job-level data available
                    </div>
                  )}
                </div>
              </div>

              {/* Runs table */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800">
                  <h2 className="text-gray-300 text-sm font-semibold">
                    Recent Runs
                    <span className="text-gray-700 font-normal ml-2 font-mono">
                      ({data.runs.length})
                    </span>
                  </h2>
                </div>
                <RunsTable runs={data.runs} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
