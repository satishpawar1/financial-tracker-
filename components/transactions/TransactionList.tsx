'use client'

import { useState } from 'react'
import { TransactionRow } from './TransactionRow'
import { TransactionForm } from './TransactionForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ArrowLeftRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { Transaction, Category, HouseholdMember } from '@/types/database.types'

type TransactionWithRelations = Transaction & {
  categories?: Pick<Category, 'name' | 'color'> | null
  household_members?: Pick<HouseholdMember, 'display_name'> | null
}

type SortKey = 'date' | 'category' | 'amount' | 'person'
type SortDir = 'asc' | 'desc'

interface Props {
  transactions: TransactionWithRelations[]
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-30" />
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />
}

export function TransactionList({ transactions, members, categories, defaultMemberId }: Props) {
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'date') {
      cmp = a.transaction_date.localeCompare(b.transaction_date)
    } else if (sortKey === 'category') {
      const ca = a.categories?.name ?? 'zzz'
      const cb = b.categories?.name ?? 'zzz'
      cmp = ca.localeCompare(cb)
    } else if (sortKey === 'amount') {
      cmp = Number(a.amount) - Number(b.amount)
    } else if (sortKey === 'person') {
      const pa = a.household_members?.display_name ?? ''
      const pb = b.household_members?.display_name ?? ''
      cmp = pa.localeCompare(pb)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="No transactions yet"
        description="Add your first transaction using the button above."
      />
    )
  }

  const cols: { key: SortKey; label: string; className: string }[] = [
    { key: 'date', label: 'Date', className: 'w-20 hidden sm:flex' },
    { key: 'category', label: 'Category', className: 'flex-1 hidden sm:flex' },
    { key: 'person', label: 'Person', className: 'w-24 hidden sm:flex' },
    { key: 'amount', label: 'Amount', className: 'w-24 text-right' },
  ]

  return (
    <>
      {/* Column header */}
      <div className="flex items-center gap-3 px-0 py-1.5 border-b text-xs text-muted-foreground font-medium">
        {/* spacer for color dot */}
        <span className="h-8 w-8 shrink-0" />
        {/* Description label (not sortable — too varied) */}
        <span className="flex-1 min-w-0 text-xs text-muted-foreground">Description</span>
        {cols.map(col => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={`flex items-center gap-0.5 hover:text-foreground transition-colors shrink-0 ${col.className} ${
              sortKey === col.key ? 'text-foreground' : ''
            }`}
          >
            {col.label}
            <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
          </button>
        ))}
        {/* spacer for action buttons */}
        <span className="w-8 hidden sm:block" />
        <span className="w-8 sm:hidden" />
      </div>

      <div>
        {sorted.map(t => (
          <TransactionRow key={t.id} transaction={t} onEdit={setEditing} />
        ))}
      </div>

      <Sheet open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {editing && (
              <TransactionForm
                members={members}
                categories={categories}
                defaultMemberId={defaultMemberId}
                transaction={editing}
                onSuccess={() => setEditing(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
