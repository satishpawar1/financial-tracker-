'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/currency'

interface CategoryData {
  name: string
  color: string
  total: number
}

interface Props {
  data: CategoryData[]
}

export function CategoryBreakdown({ data }: Props) {
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No expense data</p>

  const total = data.reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="total"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Ranked list */}
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-sm flex-1 truncate">{d.name}</span>
            <span className="text-sm text-muted-foreground">{Math.round((d.total / total) * 100)}%</span>
            <span className="text-sm font-medium">{formatCurrency(d.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
