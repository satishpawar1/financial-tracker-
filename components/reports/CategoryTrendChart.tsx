'use client'

import { useState, useTransition } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { getCategoryTrend } from '@/actions/transactions'
import { formatCurrency } from '@/lib/utils/currency'
import type { Category } from '@/types/database.types'

interface TrendPoint {
  month: string
  label: string
  amount: number
}

interface Props {
  categories: Category[]
  initialCategoryId: string
  initialData: TrendPoint[]
}

function linearTrend(data: TrendPoint[]): TrendPoint[] {
  const n = data.length
  if (n < 2) return data
  const xs = data.map((_, i) => i)
  const ys = data.map(d => d.amount)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return data.map((d, i) => ({ ...d, trend: Math.max(0, intercept + slope * i) }))
}

export function CategoryTrendChart({ categories, initialCategoryId, initialData }: Props) {
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [data, setData] = useState<TrendPoint[]>(initialData)
  const [months, setMonths] = useState(12)
  const [isPending, startTransition] = useTransition()

  function load(catId: string, m: number) {
    startTransition(async () => {
      const result = await getCategoryTrend(catId, m)
      setData(result)
    })
  }

  function handleCategory(catId: string) {
    setCategoryId(catId)
    load(catId, months)
  }

  function handleMonths(m: number) {
    setMonths(m)
    load(categoryId, m)
  }

  const selectedCat = categories.find(c => c.id === categoryId)
  const chartData = linearTrend(data) as (TrendPoint & { trend: number })[]
  const avg = data.length ? data.reduce((s, d) => s + d.amount, 0) / data.length : 0
  const nonZero = data.filter(d => d.amount > 0)
  const max = nonZero.length ? Math.max(...nonZero.map(d => d.amount)) : 0
  const maxMonth = data.find(d => d.amount === max)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <select
          value={categoryId}
          onChange={e => handleCategory(e.target.value)}
          className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {[6, 12, 24].map(m => (
            <button
              key={m}
              onClick={() => handleMonths(m)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                months === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Monthly avg</p>
          <p className="text-sm font-semibold mt-0.5">{formatCurrency(avg)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Peak month</p>
          <p className="text-sm font-semibold mt-0.5">{maxMonth ? maxMonth.label : '—'}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Peak spend</p>
          <p className="text-sm font-semibold mt-0.5">{formatCurrency(max)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className={isPending ? 'opacity-50 pointer-events-none' : ''}>
        {data.every(d => d.amount === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No spending data for {selectedCat?.name ?? 'this category'} in the selected period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
                width={44}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(Number(value)), '']}
                labelStyle={{ fontWeight: 600 }}
              />
              <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'avg', fontSize: 10, fill: '#94a3b8' }} />
              <Bar
                dataKey="amount"
                name="Spend"
                fill={selectedCat?.color ?? '#6366f1'}
                radius={[3, 3, 0, 0]}
                opacity={0.85}
              />
              <Line
                type="monotone"
                dataKey="trend"
                name="Trend"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                strokeDasharray="0"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
