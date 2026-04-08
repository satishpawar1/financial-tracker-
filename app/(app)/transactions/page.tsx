import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/actions/transactions'
import { getCategories } from '@/actions/categories'
import { TransactionList } from '@/components/transactions/TransactionList'
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet'
import { MonthPicker } from '@/components/transactions/MonthPicker'
import { TransactionFilterBar } from '@/components/transactions/TransactionFilterBar'
import { currentMonthRange } from '@/lib/utils/dates'

interface Props {
  searchParams: Promise<{ from?: string; to?: string; category?: string; person?: string; uncategorized?: string }>
}

export default async function TransactionsPage({ searchParams }: Props) {
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
  const uncategorized = params.uncategorized === 'true'

  const [transactions, categories] = await Promise.all([
    getTransactions({
      from: uncategorized ? undefined : from,
      to: uncategorized ? undefined : to,
      categoryId: params.category,
      paidBy: params.person,
      uncategorized,
    }),
    getCategories(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transactions</h1>
        <AddTransactionSheet
          members={allMembers ?? []}
          categories={categories}
          defaultMemberId={member?.id ?? ''}
        />
      </div>

      {!uncategorized && <MonthPicker currentFrom={from} />}

      <TransactionFilterBar
        categories={categories}
        members={allMembers ?? []}
      />

      {uncategorized && (
        <p className="text-xs text-muted-foreground">
          Showing all {transactions.length} uncategorized transactions across all time
        </p>
      )}

      <TransactionList
        transactions={transactions as unknown as Parameters<typeof TransactionList>[0]['transactions']}
        members={allMembers ?? []}
        categories={categories}
        defaultMemberId={member?.id ?? ''}
      />
    </div>
  )
}
