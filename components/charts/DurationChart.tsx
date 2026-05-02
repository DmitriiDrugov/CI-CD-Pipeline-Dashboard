'use client';

import type { JobStat } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DurationChartProps {
  data: JobStat[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function DurationChart({ data }: DurationChartProps) {
  const chartData = data.slice(0, 12).map((d) => ({
    name: truncate(d.name, 18),
    fullName: d.name,
    avgDuration: d.avgDuration,
    successRate: d.successRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 55 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={{ stroke: '#1f2937' }}
          tickLine={false}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatDuration}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#f9fafb',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
          formatter={(value: number, _: string, props: { payload?: { fullName?: string } }) => [
            formatDuration(value as number),
            props.payload?.fullName ?? '',
          ]}
          labelFormatter={() => 'Avg Duration'}
        />
        <Bar dataKey="avgDuration" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.successRate > 80
                  ? '#3b82f6'
                  : entry.successRate > 60
                    ? '#eab308'
                    : '#ef4444'
              }
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
