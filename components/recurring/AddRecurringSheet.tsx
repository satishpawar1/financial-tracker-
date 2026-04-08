'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RecurringForm } from './RecurringForm'
import { Plus } from 'lucide-react'
import type { Category, HouseholdMember } from '@/types/database.types'

interface Props {
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
}

export function AddRecurringSheet({ members, categories, defaultMemberId }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Recurring Rule</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <RecurringForm
              members={members}
              categories={categories}
              defaultMemberId={defaultMemberId}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
