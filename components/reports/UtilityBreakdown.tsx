'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { UtilityBreakdownResult } from '@/actions/transactions'

const PROVIDER_COLORS = ['#0ea5e9', '#d946ef', '#f97316', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6', '#fb923c']

interface Props {
  data: UtilityBreakdownResult
}

export function UtilityBreakdown({ data }: Props) {
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No utility transactions found
      </p>
    )
  }

  const spikes = data.filter(p => p.isSpike)

  const monthSlots = data[0].months
  const chartData = monthSlots.map(slot => {
    const row: Record<string, string | number> = { label: slot.label }
    for (const provider of data) {
      const m = provider.months.find(m => m.month === slot.month)
      row[provider.provider] = m?.amount ?? 0
    }
    return row
  })

  return (
    <div className="space-y-4">
      {spikes.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Unusual utility spend detected
            </p>
            <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
              {spikes.map(p => (
                <li key={p.provider}>
                  {p.provider}: {formatCurrency(p.currentMonthAmount)} this month
                  {p.pctAboveAvg !== null && (
                    <> (+{p.pctAboveAvg.toFixed(0)}% above 3-month avg of {formatCurrency(p.threeMonthAvg)})</>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {data.map((p, i) => (
          <div key={p.provider} className="flex items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: PROVIDER_COLORS[i % PROVIDER_COLORS.length] }}
            />
            <span className="flex-1 text-sm">{p.provider}</span>
            {p.isSpike && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-400">
                SPIKE
              </span>
            )}
            {p.threeMonthAvg > 0 && (
              <span className="text-xs text-muted-foreground">avg {formatCurrency(p.threeMonthAvg)}</span>
            )}
            <span className="text-sm font-medium">{formatCurrency(p.currentMonthAmount)}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)}
            width={44}
          />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          {data.map((p, i) => (
            <Bar
              key={p.provider}
              dataKey={p.provider}
              stackId="utility"
              fill={PROVIDER_COLORS[i % PROVIDER_COLORS.length]}
              radius={i === data.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
