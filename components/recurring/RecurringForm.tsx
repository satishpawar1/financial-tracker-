'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AmountInput } from '@/components/shared/AmountInput'
import { CategoryPicker } from '@/components/shared/CategoryPicker'
import { PersonPicker } from '@/components/shared/PersonPicker'
import { createRecurringRule, updateRecurringRule } from '@/actions/recurring'
import type { Category, HouseholdMember, RecurringRule } from '@/types/database.types'
import { toISODate } from '@/lib/utils/dates'
import { toast } from 'sonner'

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

interface Props {
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
  rule?: RecurringRule
  onSuccess?: () => void
}

export function RecurringForm({ members, categories, defaultMemberId, rule, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(rule?.category_id ?? null)
  const [paidBy, setPaidBy] = useState(rule?.paid_by ?? defaultMemberId)
  const [isIncome, setIsIncome] = useState(rule?.is_income ?? false)
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'biweekly'|'monthly'|'yearly'>((rule?.frequency as 'daily'|'weekly'|'biweekly'|'monthly'|'yearly') ?? 'monthly')
  const [dayOfWeek, setDayOfWeek] = useState<string>(rule?.day_of_week != null ? String(rule.day_of_week) : '1')
  const [dayOfMonth, setDayOfMonth] = useState<string>(rule?.day_of_month != null ? String(rule.day_of_month) : '1')
  const [startDate, setStartDate] = useState(rule?.start_date ?? toISODate(new Date()))
  const [endDate, setEndDate] = useState(rule?.end_date ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || isNaN(numAmount)) { toast.error('Enter a valid amount'); return }
    if (!description.trim()) { toast.error('Enter a description'); return }

    const payload = {
      paid_by: paidBy,
      category_id: categoryId,
      amount: numAmount,
      description: description.trim(),
      is_income: isIncome,
      frequency,
      day_of_week: frequency === 'weekly' ? parseInt(dayOfWeek) : null,
      day_of_month: (frequency === 'monthly' || frequency === 'yearly') ? parseInt(dayOfMonth) : null,
      // biweekly uses start_date as the anchor — no day_of_week/day_of_month needed
      start_date: startDate,
      end_date: endDate || null,
    }

    startTransition(async () => {
      try {
        if (rule) {
          await updateRecurringRule(rule.id, payload)
          toast.success('Rule updated')
        } else {
          await createRecurringRule(payload)
          toast.success('Recurring rule created')
        }
        onSuccess?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-md border overflow-hidden">
        <button type="button" className={`flex-1 py-2 text-sm font-medium transition-colors ${!isIncome ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setIsIncome(false)}>Expense</button>
        <button type="button" className={`flex-1 py-2 text-sm font-medium transition-colors ${isIncome ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setIsIncome(true)}>Income</button>
      </div>

      <div className="space-y-1.5">
        <Label>Amount</Label>
        <AmountInput value={amount} onChange={setAmount} />
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Rent, Salary..." />
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
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={v => setFrequency(v as typeof frequency)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly (every 2 weeks)</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {frequency === 'biweekly' && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
          Repeats every 14 days starting from the start date below. Set the start date to your next payday.
        </p>
      )}

      {frequency === 'weekly' && (
        <div className="space-y-1.5">
          <Label>Day of week</Label>
          <Select value={dayOfWeek} onValueChange={(v) => setDayOfWeek(v ?? '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {(frequency === 'monthly' || frequency === 'yearly') && (
        <div className="space-y-1.5">
          <Label>Day of month</Label>
          <Select value={dayOfMonth} onValueChange={(v) => setDayOfMonth(v ?? '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({length: 28}, (_, i) => i + 1).map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End date (optional)</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
      </Button>
    </form>
  )
}
