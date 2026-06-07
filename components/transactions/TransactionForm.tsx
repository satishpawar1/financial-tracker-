'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountInput } from '@/components/shared/AmountInput'
import { CategoryPicker } from '@/components/shared/CategoryPicker'
import { PersonPicker } from '@/components/shared/PersonPicker'
import { createTransaction, updateTransaction } from '@/actions/transactions'
import type { Category, HouseholdMember, Transaction } from '@/types/database.types'
import { toISODate } from '@/lib/utils/dates'
import { UTILITY_TYPES } from '@/lib/utils/utility-types'
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
  const [utilityType, setUtilityType] = useState<string>(transaction?.utility_type ?? '')
  const [utilityProvider, setUtilityProvider] = useState(transaction?.utility_provider ?? '')

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isUtility = !isIncome && selectedCategory?.name === 'Utilities'

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
        const utilityFields = isUtility
          ? {
              utility_type: utilityType || null,
              utility_provider: utilityProvider.trim() || null,
            }
          : { utility_type: null, utility_provider: null }

        if (transaction) {
          await updateTransaction(transaction.id, {
            paid_by: paidBy,
            category_id: categoryId,
            amount: numAmount,
            description: description.trim(),
            transaction_date: date,
            is_income: isIncome,
            notes: notes.trim() || null,
            ...utilityFields,
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
            ...utilityFields,
          })
          toast.success(isIncome ? 'Income added' : 'Expense added')
          setAmount('')
          setDescription('')
          setNotes('')
          setUtilityType('')
          setUtilityProvider('')
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

      {/* Utility sub-fields — only shown when Utilities category is selected */}
      {isUtility && (
        <div className="rounded-lg border border-dashed px-3 py-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Utility Details</p>
          <div className="space-y-1.5">
            <Label htmlFor="utility-type">Utility Type</Label>
            <Select value={utilityType} onValueChange={v => setUtilityType(v ?? '')}>
              <SelectTrigger id="utility-type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {UTILITY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="utility-provider">Provider (optional)</Label>
            <Input
              id="utility-provider"
              value={utilityProvider}
              onChange={e => setUtilityProvider(e.target.value)}
              placeholder="e.g. PG&E, Comcast, City Water…"
            />
          </div>
        </div>
      )}

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
