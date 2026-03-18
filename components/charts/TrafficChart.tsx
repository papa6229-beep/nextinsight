'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TrafficRow } from '@/types/marketing'
import { toTrafficChartData } from '@/lib/data-transformer'

interface Props { data: TrafficRow[] }

export function TrafficChart({ data }: Props) {
  const chartData = toTrafficChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
        <Legend />
        <Bar dataKey="domestic" stackId="a" fill="#3b82f6" name="국내" />
        <Bar dataKey="overseas" stackId="a" fill="#ef4444" name="해외" />
      </BarChart>
    </ResponsiveContainer>
  )
}
