'use client'

import { useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BudgetProgress } from './BudgetProgress'
import { formatCurrency } from '@/lib/utils/currency'
import { deleteBudget } from '@/actions/budgets'
import { Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BudgetWithSpend {
  id: string
  category_id: string
  amount: number
  spent: number
  percentage: number
  categories?: {
    id: string
    name: string
    color: string
    icon: string
  } | null
}

interface Props {
  budget: BudgetWithSpend
  onEdit?: (b: BudgetWithSpend) => void
}

export function BudgetCard({ budget, onEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const remaining = Number(budget.amount) - budget.spent

  function handleDelete() {
    if (!confirm('Delete this budget?')) return
    startTransition(async () => {
      try {
        await deleteBudget(budget.id)
        toast.success('Budget deleted')
      } catch {
        toast.error('Failed to delete')
      }
    })
  }

  return (
    <Card className={cn(isPending && 'opacity-50')}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: budget.categories?.color ?? '#6366f1' }}
            >
              {(budget.categories?.name ?? 'U').charAt(0)}
            </span>
            <div>
              <p className="font-medium text-sm">{budget.categories?.name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(budget.spent)} of {formatCurrency(Number(budget.amount))}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(budget)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <BudgetProgress percentage={budget.percentage} className="mb-2" />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{budget.percentage}% used</span>
          <span className={remaining < 0 ? 'text-destructive font-medium' : ''}>
            {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
