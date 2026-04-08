'use client'

import { useTransition, useRef, useState } from 'react'
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

const SWIPE_THRESHOLD = 72

export function TransactionRow({ transaction: t, onEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine scroll direction on first significant movement
    if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }

    if (!isHorizontal.current) return

    // Only allow left swipe (negative dx)
    if (dx < 0) {
      e.preventDefault()
      setOffset(Math.max(dx, -SWIPE_THRESHOLD - 16))
    } else if (offset < 0) {
      setOffset(Math.min(0, dx + offset))
    }
  }

  function handleTouchEnd() {
    setSwiping(false)
    isHorizontal.current = null
    if (offset < -SWIPE_THRESHOLD / 2) {
      setOffset(-SWIPE_THRESHOLD)
    } else {
      setOffset(0)
    }
  }

  function handleDelete() {
    setOffset(0)
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
    <div
      className={cn('relative overflow-hidden border-b last:border-0', isPending && 'opacity-50')}
    >
      {/* Swipe-reveal delete button */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-destructive"
        style={{ width: SWIPE_THRESHOLD }}
      >
        <button
          onClick={handleDelete}
          className="flex flex-col items-center gap-1 text-white px-4 h-full justify-center"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>

      {/* Row content — slides left on swipe */}
      <div
        className={cn(
          'flex items-center gap-3 py-3 bg-background relative',
          !swiping && 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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

        {/* Desktop action buttons — hidden on touch devices */}
        <div className="hidden sm:flex gap-1 shrink-0">
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

        {/* Mobile edit button */}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden h-8 w-8 shrink-0"
            onClick={() => { setOffset(0); onEdit(t) }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
