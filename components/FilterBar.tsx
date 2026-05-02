'use client';

import type { FilterMode } from '@/lib/types';

interface FilterBarProps {
  active: FilterMode;
  onChange: (mode: FilterMode) => void;
  counts: { all: number; passing: number; failing: number };
}

export function FilterBar({ active, onChange, counts }: FilterBarProps) {
  const filters: { mode: FilterMode; label: string; count: number }[] = [
    { mode: 'all', label: 'All', count: counts.all },
    { mode: 'passing', label: 'Passing', count: counts.passing },
    { mode: 'failing', label: 'Failing', count: counts.failing },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(({ mode, label, count }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            active === mode
              ? 'bg-gray-700 text-white border-gray-600'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-gray-800'
          }`}
        >
          {label}
          <span className="ml-2 font-mono text-xs opacity-60">{count}</span>
        </button>
      ))}
    </div>
  );
}
