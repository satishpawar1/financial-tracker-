import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  totalIncome: number
  totalExpenses: number
  net: number
}

export function MonthlySummary({ totalIncome, totalExpenses, net }: Props) {
  return (
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
  )
}
