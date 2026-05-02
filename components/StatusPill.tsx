'use client';

import type { RunConclusion, RunStatus } from '@/lib/types';

interface StatusPillProps {
  status: RunStatus;
  conclusion: RunConclusion;
  size?: 'sm' | 'md';
}

function getStatusDisplay(
  status: RunStatus,
  conclusion: RunConclusion
): { label: string; className: string } {
  if (status === 'in_progress') {
    return {
      label: 'Running',
      className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    };
  }
  if (status === 'queued' || status === 'waiting') {
    return {
      label: 'Queued',
      className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    };
  }
  switch (conclusion) {
    case 'success':
      return { label: 'Success', className: 'bg-green-500/15 text-green-400 border-green-500/30' };
    case 'failure':
      return { label: 'Failed', className: 'bg-red-500/15 text-red-400 border-red-500/30' };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      };
    case 'timed_out':
      return {
        label: 'Timed Out',
        className: 'bg-red-500/15 text-red-400 border-red-500/30',
      };
    case 'skipped':
      return { label: 'Skipped', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' };
    default:
      return {
        label: conclusion ?? status,
        className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      };
  }
}

export function StatusPill({ status, conclusion, size = 'sm' }: StatusPillProps) {
  const { label, className } = getStatusDisplay(status, conclusion);
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-medium ${sizeClass} ${className}`}
    >
      {status === 'in_progress' && (
        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5 animate-pulse" />
      )}
      {label}
    </span>
  );
}
