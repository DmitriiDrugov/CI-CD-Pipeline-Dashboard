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
  Area,
  AreaChart,
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
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
          interval={6}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
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
          labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4, fontSize: 11 }}
          itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
        />
        <Legend
          wrapperStyle={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            fontFamily: 'var(--font-geist-mono)',
          }}
        />
        <Area
          type="monotone"
          dataKey="success"
          stroke="#22c55e"
          strokeWidth={1.5}
          fill="url(#colorSuccess)"
          dot={false}
          activeDot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
          name="Success"
        />
        <Area
          type="monotone"
          dataKey="failure"
          stroke="#ef4444"
          strokeWidth={1.5}
          fill="url(#colorFailure)"
          dot={false}
          activeDot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
          name="Failure"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
