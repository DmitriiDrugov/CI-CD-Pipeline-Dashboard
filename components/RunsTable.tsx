'use client';

import type { WorkflowRun } from '@/lib/types';
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

export function RunsTable({ runs }: { runs: WorkflowRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="py-12 text-center text-gray-600 text-sm">No workflow runs found.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {['#', 'Branch', 'Commit', 'Status', 'Duration', 'Triggered'].map((h) => (
              <th
                key={h}
                className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors"
            >
              <td className="py-3 px-4 font-mono text-xs">
                <a
                  href={run.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-400 transition-colors"
                >
                  #{run.run_number}
                </a>
              </td>
              <td className="py-3 px-4 font-mono text-xs text-gray-400 max-w-[120px]">
                <span className="truncate block" title={run.head_branch}>
                  {run.head_branch}
                </span>
              </td>
              <td className="py-3 px-4 text-xs text-gray-500 max-w-[260px]">
                <span
                  className="truncate block"
                  title={run.head_commit.message}
                >
                  {run.head_commit.message.split('\n')[0]?.slice(0, 72) ?? ''}
                </span>
              </td>
              <td className="py-3 px-4">
                <StatusPill status={run.status} conclusion={run.conclusion} />
              </td>
              <td className="py-3 px-4 font-mono text-xs text-gray-400">
                {formatDuration(run.durationSeconds)}
              </td>
              <td className="py-3 px-4 text-xs text-gray-600">
                {formatRelative(run.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
