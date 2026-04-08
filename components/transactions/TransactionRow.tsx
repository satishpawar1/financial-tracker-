'use client'

import { useTransition } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteTransaction } from '@/actions/transactions'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import type { Transaction, Category, HouseholdMember } from '@/types/database.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type TransactionWithRelations = Transaction & {
  categories?: Pick<Category, 'name' | 'color'> | null
  household_members?: Pick<HouseholdMember, 'display_name'> | null
}

interface Props {
  transaction: TransactionWithRelations
  onEdit?: (t: TransactionWithRelations) => void
}

export function TransactionRow({ transaction: t, onEdit }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this transaction?')) return
    startTransition(async () => {
      try {
        await deleteTransaction(t.id)
        toast.success('Deleted')
      } catch {
        toast.error('Failed to delete')
      }
    })
  }

  return (
    <div className={cn(
      'flex items-center gap-3 py-3 border-b last:border-0',
      isPending && 'opacity-50'
    )}>
      {/* Category color dot */}
      <span
        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
        style={{ backgroundColor: t.categories?.color ?? '#94a3b8' }}
      >
        {(t.categories?.name ?? 'O').charAt(0).toUpperCase()}
      </span>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.description}</p>
        <p className="text-xs text-muted-foreground">
          {t.categories?.name ?? 'Uncategorized'} · {t.household_members?.display_name ?? '—'} · {formatDate(t.transaction_date, 'MMM d')}
        </p>
      </div>

      {/* Amount */}
      <span className={cn(
        'text-sm font-semibold shrink-0',
        t.is_income ? 'text-emerald-600' : 'text-foreground'
      )}>
        {t.is_income ? '+' : '-'}{formatCurrency(Number(t.amount))}
      </span>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
