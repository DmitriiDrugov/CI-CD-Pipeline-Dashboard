'use client';

import Link from 'next/link';
import type { RepoStats } from '@/lib/types';

interface HealthOverviewProps {
  repoStats: RepoStats[];
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'yellow' | 'default';
}) {
  const valueColor =
    accent === 'green'
      ? 'text-green-400'
      : accent === 'red'
        ? 'text-red-400'
        : accent === 'yellow'
          ? 'text-yellow-400'
          : 'text-white';

  return (
    <div className="relative rounded-xl bg-bg-raised border border-white/5 p-4 overflow-hidden group">
      <div className="absolute inset-0 bg-card-shine pointer-events-none" />
      <div className="relative">
        <p className="text-xs text-white/35 mb-2 uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-3xl font-bold font-mono tabular leading-none ${valueColor}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-white/25 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

export function HealthOverview({ repoStats }: HealthOverviewProps) {
  const ready = repoStats.filter((s) => s.hasWorkflows && !s.workflowsLoading);
  const totalRepos = repoStats.length;
  const totalRuns = ready.reduce((s, r) => s + r.totalRuns, 0);

  const overallRate =
    ready.length > 0
      ? Math.round(ready.reduce((s, r) => s + r.successRate, 0) / ready.length)
      : null;

  const highFail = ready.filter((s) => 100 - s.successRate > 40);

  const rateAccent =
    overallRate === null
      ? 'default'
      : overallRate > 80
        ? 'green'
        : overallRate > 60
          ? 'yellow'
          : 'red';

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          Overview
        </h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Repos"
          value={String(totalRepos)}
          sub={`${ready.length} with workflows`}
        />
        <MetricCard
          label="Success Rate"
          value={overallRate !== null ? `${overallRate}%` : '—'}
          sub="across all repos"
          accent={rateAccent}
        />
        <MetricCard
          label="Total Runs"
          value={totalRuns > 0 ? totalRuns.toLocaleString() : '—'}
          sub="last 30 days"
        />
        <MetricCard
          label="Failing Repos"
          value={String(highFail.length)}
          sub=">40% failure rate"
          accent={highFail.length > 0 ? 'red' : 'green'}
        />
      </div>

      {highFail.length > 0 && (
        <div className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-red-400/70 font-medium shrink-0">High failure rate:</span>
          <div className="flex flex-wrap gap-1.5">
            {highFail.map((s) => (
              <Link
                key={s.repo.id}
                href={`/repo/${s.repo.owner.login}/${s.repo.name}`}
                className="text-xs font-mono text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-md px-2 py-0.5 hover:bg-red-500/20 transition-colors"
              >
                {s.repo.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
