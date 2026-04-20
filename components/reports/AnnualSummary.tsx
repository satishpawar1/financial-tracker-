import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, Wallet, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  totalIncome: number
  totalExpenses: number
  net: number
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  monthsElapsed: number
  isCurrentYear: boolean
  year: number
}

export function AnnualSummary({
  totalIncome,
  totalExpenses,
  net,
  avgMonthlyIncome,
  avgMonthlyExpenses,
  monthsElapsed,
  isCurrentYear,
  year,
}: Props) {
  const rangeLabel = isCurrentYear
    ? `Jan–${MONTH_NAMES[monthsElapsed - 1]} ${year}`
    : `Full year ${year}`

  return (
    <div className="space-y-3">
      {/* Totals row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-muted-foreground font-medium">Income</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs text-muted-foreground font-medium">Expenses</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Net</span>
            </div>
            <p className={cn('text-lg font-bold', net >= 0 ? 'text-emerald-600' : 'text-destructive')}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly averages */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Monthly Average
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{rangeLabel}</span>
          </div>
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Avg Income</p>
              <p className="text-base font-semibold text-emerald-600">{formatCurrency(avgMonthlyIncome)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Avg Expenses</p>
              <p className="text-base font-semibold">{formatCurrency(avgMonthlyExpenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
