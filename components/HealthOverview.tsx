'use client';

import Link from 'next/link';
import type { RepoStats } from '@/lib/types';

interface HealthOverviewProps {
  repoStats: RepoStats[];
}

function StatCard({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="bg-gray-950 border border-gray-800/60 rounded-lg p-4">
      <p className="text-gray-600 text-xs mb-2">{label}</p>
      <p className={`text-2xl font-mono font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function HealthOverview({ repoStats }: HealthOverviewProps) {
  const reposWithWorkflows = repoStats.filter((s) => s.hasWorkflows && !s.workflowsLoading);
  const totalRepos = repoStats.length;
  const totalRuns = reposWithWorkflows.reduce((sum, s) => sum + s.totalRuns, 0);

  const overallSuccessRate =
    reposWithWorkflows.length > 0
      ? Math.round(
          reposWithWorkflows.reduce((sum, s) => sum + s.successRate, 0) / reposWithWorkflows.length
        )
      : 0;

  const highFailureRepos = reposWithWorkflows.filter((s) => 100 - s.successRate > 40);

  const rateColor =
    overallSuccessRate > 80
      ? 'text-green-400'
      : overallSuccessRate > 60
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h2 className="text-gray-300 text-sm font-semibold mb-4">Health Overview</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Repos Monitored" value={totalRepos} />
        <StatCard
          label="Overall Success Rate"
          value={reposWithWorkflows.length > 0 ? `${overallSuccessRate}%` : '—'}
          valueClass={rateColor}
        />
        <StatCard label="Total Runs (30d)" value={totalRuns} />
        <StatCard
          label="High Failure Rate"
          value={highFailureRepos.length}
          valueClass={highFailureRepos.length > 0 ? 'text-red-400' : 'text-green-400'}
        />
      </div>

      {highFailureRepos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 mb-2">Repos with failure rate &gt;40%:</p>
          <div className="flex flex-wrap gap-2">
            {highFailureRepos.map((s) => (
              <Link
                key={s.repo.id}
                href={`/repo/${s.repo.owner.login}/${s.repo.name}`}
                className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 hover:bg-red-500/20 transition-colors"
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
