'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TransactionForm } from './TransactionForm'
import { Plus } from 'lucide-react'
import type { Category, HouseholdMember } from '@/types/database.types'

interface Props {
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
  defaultIsIncome?: boolean
  label?: string
}

export function AddTransactionSheet({ members, categories, defaultMemberId, defaultIsIncome, label }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label ?? 'Add'}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{label ?? (defaultIsIncome ? 'Add Income' : 'Add Expense')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TransactionForm
              members={members}
              categories={categories}
              defaultMemberId={defaultMemberId}
              defaultIsIncome={defaultIsIncome}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
