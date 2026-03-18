'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { SalesRow } from '@/types/marketing'
import { toSalesChartData } from '@/lib/data-transformer'

interface Props { data: SalesRow[] }

export function MemberChart({ data }: Props) {
  const chartData = toSalesChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
          formatter={(v) => v !== undefined ? [`${(v as number).toLocaleString()}명`, '신규가입'] : null}
        />
        <Bar dataKey="newMembers" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}
