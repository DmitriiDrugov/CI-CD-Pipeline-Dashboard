'use client';

import Link from 'next/link';
import type { RepoStats } from '@/lib/types';
import { StatusPill } from './StatusPill';

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function SuccessRateBadge({ rate }: { rate: number }) {
  const cls =
    rate > 80
      ? 'bg-green-500/15 text-green-400 border-green-500/30'
      : rate > 60
        ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
        : 'bg-red-500/15 text-red-400 border-red-500/30';
  return (
    <span className={`inline-flex items-center rounded-full border font-mono text-xs px-2 py-0.5 ${cls}`}>
      {rate}%
    </span>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function RepoCard({ stats }: { stats: RepoStats }) {
  const { repo, lastRun, successRate, avgDuration, totalRuns, hasWorkflows, workflowsLoading } =
    stats;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/repo/${repo.owner.login}/${repo.name}`}
            className="text-gray-100 font-semibold hover:text-white transition-colors truncate block"
          >
            {repo.name}
          </Link>
          {repo.description && (
            <p className="text-gray-600 text-xs mt-1 truncate" title={repo.description}>
              {repo.description}
            </p>
          )}
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:text-gray-400 transition-colors ml-3 flex-shrink-0 mt-0.5"
          title="View on GitHub"
        >
          <GitHubIcon />
        </a>
      </div>

      {/* Workflow State */}
      {workflowsLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-gray-800 rounded-full" />
            <div className="h-5 w-20 bg-gray-800/60 rounded" />
          </div>
          <div className="h-3 w-48 bg-gray-800/40 rounded" />
        </div>
      ) : !hasWorkflows ? (
        <p className="text-gray-700 text-xs italic">No workflows configured</p>
      ) : lastRun ? (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusPill status={lastRun.status} conclusion={lastRun.conclusion} />
            <span className="text-gray-500 text-xs font-mono truncate max-w-[120px]">
              {lastRun.head_branch}
            </span>
            <span className="text-gray-700 text-xs">{formatRelative(lastRun.created_at)}</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 text-xs">Success</span>
              <SuccessRateBadge rate={successRate} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 text-xs">Avg</span>
              <span className="text-gray-400 font-mono text-xs">{formatDuration(avgDuration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 text-xs">Runs</span>
              <span className="text-gray-400 font-mono text-xs">{totalRuns}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-700 text-xs italic">No workflow runs yet</p>
      )}
    </div>
  );
}
