'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BudgetForm } from './BudgetForm'
import { Plus } from 'lucide-react'
import type { Category } from '@/types/database.types'

interface Props {
  availableCategories: Category[]
}

export function AddBudgetSheet({ availableCategories }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" className="gap-1.5" disabled={availableCategories.length === 0} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Budget</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <BudgetForm categories={availableCategories} onSuccess={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
