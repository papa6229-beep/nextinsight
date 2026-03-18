'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { SalesRow } from '@/types/marketing'
import { toSalesChartData } from '@/lib/data-transformer'

interface Props { data: SalesRow[] }

export function SalesChart({ data }: Props) {
  const chartData = toSalesChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
          formatter={(v) => v !== undefined ? [`${(v as number).toLocaleString()}원`, '매출'] : null}
          labelFormatter={l => `날짜: ${l}`}
        />
        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
