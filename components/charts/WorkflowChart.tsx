'use client';

import type { DailyStat } from '@/lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface WorkflowChartProps {
  data: DailyStat[];
}

export function WorkflowChart({ data }: WorkflowChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}
          interval={6}
          axisLine={{ stroke: '#1f2937' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
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
          labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
        />
        <Legend
          wrapperStyle={{ color: '#6b7280', fontSize: '11px', fontFamily: 'monospace' }}
        />
        <Line
          type="monotone"
          dataKey="success"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#22c55e' }}
          name="Success"
        />
        <Line
          type="monotone"
          dataKey="failure"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#ef4444' }}
          name="Failure"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
