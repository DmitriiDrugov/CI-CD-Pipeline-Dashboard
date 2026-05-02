'use client';

import type { WorkflowRun } from '@/lib/types';
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

export function RunsTable({ runs }: { runs: WorkflowRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="py-16 text-center text-white/25 text-sm">No workflow runs found.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {['Run', 'Branch', 'Commit', 'Status', 'Duration', 'When'].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3 text-xs font-medium text-white/30 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => (
            <tr
              key={run.id}
              className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                i % 2 === 0 ? '' : 'bg-white/[0.01]'
              }`}
            >
              <td className="px-5 py-3">
                <a
                  href={run.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-white/30 hover:text-indigo-400 transition-colors"
                >
                  #{run.run_number}
                </a>
              </td>
              <td className="px-5 py-3">
                <span className="font-mono text-xs text-white/40 truncate block max-w-[120px]" title={run.head_branch}>
                  {run.head_branch}
                </span>
              </td>
              <td className="px-5 py-3 max-w-[260px]">
                <span
                  className="text-xs text-white/35 truncate block"
                  title={run.head_commit.message}
                >
                  {run.head_commit.message.split('\n')[0]?.slice(0, 70) ?? ''}
                </span>
              </td>
              <td className="px-5 py-3">
                <StatusPill status={run.status} conclusion={run.conclusion} />
              </td>
              <td className="px-5 py-3">
                <span className="font-mono text-xs text-white/40 tabular">
                  {formatDuration(run.durationSeconds)}
                </span>
              </td>
              <td className="px-5 py-3">
                <span className="text-xs text-white/25">{formatRelative(run.created_at)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
