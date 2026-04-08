'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/currency'

interface TrendPoint {
  month: string
  label: string
  income: number
  expenses: number
  net: number
}

interface Props {
  data: TrendPoint[]
}

export function TrendChart({ data }: Props) {
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No trend data</p>

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Legend />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net"
          stroke="#6366f1"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
