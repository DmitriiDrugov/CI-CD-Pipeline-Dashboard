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

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function getBarColor(successRate: number): string {
  if (successRate > 80) return '#6366f1';
  if (successRate > 60) return '#eab308';
  return '#ef4444';
}

export function DurationChart({ data }: DurationChartProps) {
  const chartData = data.slice(0, 10).map((d) => ({
    name: truncate(d.name, 16),
    fullName: d.name,
    avgDuration: d.avgDuration,
    successRate: d.successRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 52 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={false}
          tickLine={false}
          angle={-38}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatDuration}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#10101e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'var(--font-geist-mono)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          formatter={(value: number, _: string, props: { payload?: { fullName?: string } }) => [
            formatDuration(value as number),
            props.payload?.fullName ?? '',
          ]}
          labelFormatter={() => 'Avg Duration'}
        />
        <Bar dataKey="avgDuration" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.successRate)} fillOpacity={0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
