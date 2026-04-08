'use client'

import { useState } from 'react'
import { TransactionRow } from './TransactionRow'
import { TransactionForm } from './TransactionForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ArrowLeftRight } from 'lucide-react'
import type { Transaction, Category, HouseholdMember } from '@/types/database.types'

type TransactionWithRelations = Transaction & {
  categories?: Pick<Category, 'name' | 'color'> | null
  household_members?: Pick<HouseholdMember, 'display_name'> | null
}

interface Props {
  transactions: TransactionWithRelations[]
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
}

export function TransactionList({ transactions, members, categories, defaultMemberId }: Props) {
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null)

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="No transactions yet"
        description="Add your first transaction using the button above."
      />
    )
  }

  return (
    <>
      <div>
        {transactions.map(t => (
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
