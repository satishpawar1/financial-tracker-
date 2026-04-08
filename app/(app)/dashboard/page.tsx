import { createClient } from '@/lib/supabase/server'
import { getMonthlySummary, getTransactions } from '@/actions/transactions'
import { getBudgetsWithSpend } from '@/actions/budgets'
import { getCategories } from '@/actions/categories'
import { MonthlySummary } from '@/components/reports/MonthlySummary'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { TransactionList } from '@/components/transactions/TransactionList'
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet'
import { MonthPicker } from '@/components/transactions/MonthPicker'
import { currentMonthRange } from '@/lib/utils/dates'
import Link from 'next/link'
import { RecurringTrigger } from './RecurringTrigger'

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('household_members')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: allMembers } = await supabase
    .from('household_members')
    .select('*')
    .order('created_at')

  const { from: defaultFrom, to: defaultTo } = currentMonthRange()
  const from = params.from ?? defaultFrom
  const to = params.to ?? defaultTo

  const selectedDate = new Date(from + 'T12:00:00')
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1

  const [summary, recentTx, budgets, categories] = await Promise.all([
    getMonthlySummary(year, month),
    getTransactions({ from, to, limit: 10 }),
    getBudgetsWithSpend(),
    getCategories(),
  ])

  const alertBudgets = budgets.filter(b => b.percentage >= 80)

  return (
    <div className="space-y-6">
      <RecurringTrigger />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good to see you, {member?.display_name}</p>
          <MonthPicker currentFrom={from} />
        </div>
        <AddTransactionSheet
          members={allMembers ?? []}
          categories={categories}
          defaultMemberId={member?.id ?? ''}
        />
      </div>

      <MonthlySummary
        totalIncome={summary.totalIncome}
        totalExpenses={summary.totalExpenses}
        net={summary.net}
      />

      {alertBudgets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Budget Alerts
          </h2>
          {alertBudgets.slice(0, 3).map(b => (
            <BudgetCard
              key={b.id}
              budget={b as unknown as Parameters<typeof BudgetCard>[0]['budget']}
            />
          ))}
          {alertBudgets.length > 3 && (
            <Link href="/budgets" className="text-sm text-primary">
              View all budgets →
            </Link>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent
          </h2>
          <Link href="/transactions" className="text-sm text-primary">View all</Link>
        </div>
        <TransactionList
          transactions={recentTx as unknown as Parameters<typeof TransactionList>[0]['transactions']}
          members={allMembers ?? []}
          categories={categories}
          defaultMemberId={member?.id ?? ''}
        />
      </div>
    </div>
  )
}
