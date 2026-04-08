'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@/components/shared/AmountInput'
import { CategoryPicker } from '@/components/shared/CategoryPicker'
import { PersonPicker } from '@/components/shared/PersonPicker'
import { createTransaction, updateTransaction } from '@/actions/transactions'
import type { Category, HouseholdMember, Transaction } from '@/types/database.types'
import { toISODate } from '@/lib/utils/dates'
import { toast } from 'sonner'

interface Props {
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
  transaction?: Transaction
  defaultIsIncome?: boolean
  onSuccess?: () => void
}

export function TransactionForm({
  members,
  categories,
  defaultMemberId,
  transaction,
  defaultIsIncome = false,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [date, setDate] = useState(transaction?.transaction_date ?? toISODate(new Date()))
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category_id ?? null)
  const [paidBy, setPaidBy] = useState(transaction?.paid_by ?? defaultMemberId)
  const [isIncome, setIsIncome] = useState(transaction?.is_income ?? defaultIsIncome)
  const [notes, setNotes] = useState(transaction?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    startTransition(async () => {
      try {
        if (transaction) {
          await updateTransaction(transaction.id, {
            paid_by: paidBy,
            category_id: categoryId,
            amount: numAmount,
            description: description.trim(),
            transaction_date: date,
            is_income: isIncome,
            notes: notes.trim() || null,
          })
          toast.success('Transaction updated')
        } else {
          await createTransaction({
            paid_by: paidBy,
            category_id: categoryId,
            amount: numAmount,
            description: description.trim(),
            transaction_date: date,
            is_income: isIncome,
            notes: notes.trim() || null,
          })
          toast.success(isIncome ? 'Income added' : 'Expense added')
          // Reset form
          setAmount('')
          setDescription('')
          setNotes('')
          setDate(toISODate(new Date()))
        }
        onSuccess?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Income / Expense toggle */}
      <div className="flex rounded-md border overflow-hidden">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            !isIncome ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setIsIncome(false)}
        >
          Expense
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            isIncome ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setIsIncome(true)}
        >
          Income
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <AmountInput id="amount" value={amount} onChange={setAmount} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What was this for?"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="space-y-1.5">
        <Label>Paid by</Label>
        <PersonPicker members={members} value={paidBy} onChange={setPaidBy} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional details..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Saving...' : transaction ? 'Update' : isIncome ? 'Add Income' : 'Add Expense'}
      </Button>
    </form>
  )
}
