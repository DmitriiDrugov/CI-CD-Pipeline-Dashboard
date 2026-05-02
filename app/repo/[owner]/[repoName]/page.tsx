'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { WorkflowsResponse } from '@/lib/types';
import { StatusPill } from '@/components/StatusPill';
import { RunsTable } from '@/components/RunsTable';
import dynamic from 'next/dynamic';

const WorkflowChart = dynamic(
  () => import('@/components/charts/WorkflowChart').then((m) => m.WorkflowChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const DurationChart = dynamic(
  () => import('@/components/charts/DurationChart').then((m) => m.DurationChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return <div className="h-[240px] rounded-lg bg-white/3 animate-pulse" />;
}

function formatDuration(s: number): string {
  if (s <= 0) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'yellow';
  small?: boolean;
}) {
  const color =
    accent === 'green'
      ? 'text-green-400'
      : accent === 'red'
        ? 'text-red-400'
        : accent === 'yellow'
          ? 'text-yellow-400'
          : 'text-white';

  return (
    <div className="relative rounded-xl bg-bg-raised border border-white/5 p-4 overflow-hidden">
      <div className="absolute inset-0 bg-card-shine pointer-events-none" />
      <div className="relative">
        <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2">{label}</p>
        <p className={`font-mono font-bold tabular leading-none ${small ? 'text-base break-all' : 'text-2xl'} ${color}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-white/20 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{children}</h2>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
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
          const b = (await res.json()) as { error?: string };
          throw new Error(b.error ?? `Error ${res.status}`);
        }
        if (!cancelled) setData((await res.json()) as WorkflowsResponse);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [owner, repoName]);

  const rateAccent =
    !data
      ? undefined
      : data.successRate > 80
        ? ('green' as const)
        : data.successRate > 60
          ? ('yellow' as const)
          : ('red' as const);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8 text-sm">
        <Link
          href="/"
          className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors"
        >
          <BackIcon />
          Dashboard
        </Link>
        <span className="text-white/10">/</span>
        <span className="text-white/50 font-mono text-xs">
          {owner}/<span className="text-white/70">{repoName}</span>
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-10 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-white/40 font-normal">{owner} / </span>
            <span className="text-white">{repoName}</span>
          </h1>
          <a
            href={`https://github.com/${owner}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>

        {data?.lastRun && (
          <div className="flex flex-col items-end gap-1">
            <StatusPill status={data.lastRun.status} conclusion={data.lastRun.conclusion} size="md" />
            <p className="text-xs text-white/25 font-mono">last run</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 mb-6 text-sm">
          <span className="text-red-500 flex-shrink-0">⚠</span>
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-bg-raised border border-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-bg-raised border border-white/5" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-bg-raised border border-white/5" />
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <>
          {!data.hasWorkflows ? (
            <div className="py-24 text-center text-white/25 text-sm">
              No GitHub Actions workflows configured for this repository.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Success Rate"
                  value={`${data.successRate}%`}
                  sub="last 30 runs"
                  accent={rateAccent}
                />
                <StatCard
                  label="Avg Duration"
                  value={formatDuration(data.avgDuration)}
                  sub="per run"
                />
                <StatCard
                  label="Total Runs"
                  value={String(data.totalRuns)}
                  sub="fetched"
                />
                <StatCard
                  label="Most Failing Job"
                  value={data.mostFailingJob ?? 'N/A'}
                  accent={data.mostFailingJob ? 'red' : undefined}
                  small
                />
              </div>

              {/* Charts */}
              <div>
                <SectionLabel>Trends</SectionLabel>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-bg-raised border border-white/5 p-5">
                    <p className="text-xs text-white/40 font-medium mb-5">
                      Runs per day · last 30 days
                    </p>
                    <WorkflowChart data={data.dailyStats} />
                  </div>
                  <div className="rounded-xl bg-bg-raised border border-white/5 p-5">
                    <p className="text-xs text-white/40 font-medium mb-5">
                      Avg build time per job
                    </p>
                    {data.jobStats.length > 0 ? (
                      <DurationChart data={data.jobStats} />
                    ) : (
                      <div className="h-[240px] flex items-center justify-center text-white/20 text-sm">
                        No job-level data
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Runs table */}
              <div>
                <SectionLabel>
                  Recent Runs
                  <span className="text-white/20 normal-case font-mono font-normal ml-1">
                    ({data.runs.length})
                  </span>
                </SectionLabel>
                <div className="rounded-xl bg-bg-raised border border-white/5 overflow-hidden">
                  <RunsTable runs={data.runs} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
