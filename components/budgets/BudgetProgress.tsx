import { cn } from '@/lib/utils'

interface Props {
  percentage: number
  className?: string
}

export function BudgetProgress({ percentage, className }: Props) {
  const color =
    percentage >= 100
      ? 'bg-destructive'
      : percentage >= 80
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  return (
    <div className={cn('h-2 bg-muted rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}
