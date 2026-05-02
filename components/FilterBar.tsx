'use client';

import type { FilterMode } from '@/lib/types';

interface FilterBarProps {
  active: FilterMode;
  onChange: (mode: FilterMode) => void;
  counts: { all: number; passing: number; failing: number };
}

export function FilterBar({ active, onChange, counts }: FilterBarProps) {
  const filters: { mode: FilterMode; label: string; count: number; dot?: string }[] = [
    { mode: 'all', label: 'All repos', count: counts.all },
    { mode: 'passing', label: 'Passing', count: counts.passing, dot: 'bg-green-500' },
    { mode: 'failing', label: 'Failing', count: counts.failing, dot: 'bg-red-500' },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-bg-raised border border-white/5">
      {filters.map(({ mode, label, count, dot }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
            active === mode
              ? 'bg-bg-overlay text-white shadow-sm ring-1 ring-white/8'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          {dot && (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot} ${active === mode ? 'opacity-100' : 'opacity-50'}`} />
          )}
          <span>{label}</span>
          <span
            className={`font-mono text-xs tabular ${
              active === mode ? 'text-white/50' : 'text-white/25'
            }`}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}
