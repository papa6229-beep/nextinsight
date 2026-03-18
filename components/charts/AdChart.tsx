'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import type { GoogleAdsRow } from '@/types/marketing'
import { toAdChartData } from '@/lib/data-transformer'

interface Props { data: GoogleAdsRow[] }

export function AdChart({ data }: Props) {
  const chartData = toAdChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis yAxisId="left" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
        <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} tickFormatter={v => `${v}x`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
          formatter={(v, name) => {
            if (v === undefined) return null
            const numVal = v as number
            return name === 'adSpend' ? [`${numVal.toLocaleString()}원`, '광고비'] : [`${numVal}x`, 'ROAS']
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="adSpend" fill="#6366f1" name="광고비" />
        <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#f59e0b" strokeWidth={2} dot={false} name="ROAS" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
