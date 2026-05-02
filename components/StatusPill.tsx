'use client';

import type { RunConclusion, RunStatus } from '@/lib/types';

interface StatusPillProps {
  status: RunStatus;
  conclusion: RunConclusion;
  size?: 'sm' | 'md';
}

type Display = { label: string; dot: string; ring: string; text: string; bg: string };

function getDisplay(status: RunStatus, conclusion: RunConclusion): Display {
  if (status === 'in_progress') {
    return {
      label: 'Running',
      dot: 'bg-yellow-400 animate-glow-pulse',
      ring: 'ring-yellow-500/20',
      text: 'text-yellow-300',
      bg: 'bg-yellow-500/8',
    };
  }
  if (status === 'queued' || status === 'waiting') {
    return {
      label: 'Queued',
      dot: 'bg-slate-500',
      ring: 'ring-slate-500/20',
      text: 'text-slate-400',
      bg: 'bg-slate-500/8',
    };
  }
  switch (conclusion) {
    case 'success':
      return {
        label: 'Success',
        dot: 'bg-green-500',
        ring: 'ring-green-500/20',
        text: 'text-green-400',
        bg: 'bg-green-500/8',
      };
    case 'failure':
      return {
        label: 'Failed',
        dot: 'bg-red-500',
        ring: 'ring-red-500/20',
        text: 'text-red-400',
        bg: 'bg-red-500/8',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        dot: 'bg-slate-500',
        ring: 'ring-slate-500/20',
        text: 'text-slate-400',
        bg: 'bg-slate-500/8',
      };
    case 'timed_out':
      return {
        label: 'Timed Out',
        dot: 'bg-orange-500',
        ring: 'ring-orange-500/20',
        text: 'text-orange-400',
        bg: 'bg-orange-500/8',
      };
    case 'skipped':
      return {
        label: 'Skipped',
        dot: 'bg-slate-600',
        ring: 'ring-slate-500/20',
        text: 'text-slate-500',
        bg: 'bg-slate-500/8',
      };
    default:
      return {
        label: conclusion ?? status,
        dot: 'bg-slate-500',
        ring: 'ring-slate-500/20',
        text: 'text-slate-400',
        bg: 'bg-slate-500/8',
      };
  }
}

export function StatusPill({ status, conclusion, size = 'sm' }: StatusPillProps) {
  const d = getDisplay(status, conclusion);
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-mono font-medium ${px} ${d.bg} ${d.ring} ${d.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.dot}`} />
      {d.label}
    </span>
  );
}
