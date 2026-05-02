'use client';

import Link from 'next/link';
import type { RepoStats } from '@/lib/types';
import { StatusPill } from './StatusPill';

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(s: number): string {
  if (s <= 0) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function RateBadge({ rate }: { rate: number }) {
  const [color, bg, ring] =
    rate > 80
      ? ['text-green-400', 'bg-green-500/8', 'ring-green-500/20']
      : rate > 60
        ? ['text-yellow-400', 'bg-yellow-500/8', 'ring-yellow-500/20']
        : ['text-red-400', 'bg-red-500/8', 'ring-red-500/20'];

  return (
    <span className={`inline-flex items-center rounded-full ring-1 font-mono text-xs px-2 py-0.5 tabular ${color} ${bg} ${ring}`}>
      {rate}%
    </span>
  );
}

function ExternalIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4M9 1h6m0 0v6m0-6L7 9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function RepoCard({ stats }: { stats: RepoStats }) {
  const { repo, lastRun, successRate, avgDuration, totalRuns, hasWorkflows, workflowsLoading } = stats;

  return (
    <div className="group relative rounded-xl bg-bg-raised border border-white/5 hover:border-white/10 transition-all duration-200 hover:shadow-card-hover overflow-hidden">
      {/* Subtle card shine */}
      <div className="absolute inset-0 bg-card-shine pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <Link
              href={`/repo/${repo.owner.login}/${repo.name}`}
              className="text-sm font-semibold text-white/90 hover:text-white transition-colors block truncate"
            >
              {repo.name}
            </Link>
            {repo.description && (
              <p className="text-xs text-white/30 mt-0.5 truncate leading-relaxed" title={repo.description}>
                {repo.description}
              </p>
            )}
          </div>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 mt-0.5 text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
            title="Open on GitHub"
          >
            <ExternalIcon />
          </a>
        </div>

        {/* Workflow state */}
        {workflowsLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="flex gap-2">
              <div className="h-5 w-14 rounded-full bg-white/6" />
              <div className="h-5 w-18 rounded bg-white/4" />
            </div>
            <div className="h-3 w-40 rounded bg-white/4" />
          </div>
        ) : !hasWorkflows ? (
          <p className="text-xs text-white/20 italic">No workflows configured</p>
        ) : lastRun ? (
          <div className="space-y-3">
            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={lastRun.status} conclusion={lastRun.conclusion} />
              <span className="text-xs font-mono text-white/30 truncate max-w-[110px]">
                {lastRun.head_branch}
              </span>
              <span className="text-xs text-white/20">{formatRelative(lastRun.created_at)}</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/30">Rate</span>
                <RateBadge rate={successRate} />
              </div>
              <Divider />
              <Stat label="Avg" value={formatDuration(avgDuration)} />
              <Divider />
              <Stat label="Runs" value={String(totalRuns)} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/20 italic">No runs yet</p>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-3 bg-white/8 flex-shrink-0" />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-white/25">{label}</span>
      <span className="text-xs font-mono text-white/50 tabular">{value}</span>
    </div>
  );
}
