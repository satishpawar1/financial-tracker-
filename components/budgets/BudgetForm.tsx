'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@/components/shared/AmountInput'
import { CategoryPicker } from '@/components/shared/CategoryPicker'
import { createBudget, updateBudget } from '@/actions/budgets'
import type { Category } from '@/types/database.types'
import { toast } from 'sonner'

interface Props {
  categories: Category[]
  editingId?: string
  editingAmount?: number
  editingCategoryId?: string
  onSuccess?: () => void
}

export function BudgetForm({ categories, editingId, editingAmount, editingCategoryId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [categoryId, setCategoryId] = useState<string | null>(editingCategoryId ?? null)
  const [amount, setAmount] = useState(editingAmount ? String(editingAmount) : '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!categoryId) {
      toast.error('Please select a category')
      return
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateBudget(editingId, { amount: numAmount })
          toast.success('Budget updated')
        } else {
          await createBudget({ category_id: categoryId, amount: numAmount })
          toast.success('Budget created')
          setAmount('')
          setCategoryId(null)
        }
        onSuccess?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!editingId && (
        <div className="space-y-1.5">
          <Label>Category</Label>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="budget-amount">Monthly limit</Label>
        <AmountInput id="budget-amount" value={amount} onChange={setAmount} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Saving...' : editingId ? 'Update Budget' : 'Create Budget'}
      </Button>
    </form>
  )
}
