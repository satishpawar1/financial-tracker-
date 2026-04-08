import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/actions/transactions'
import { getCategories } from '@/actions/categories'
import { TransactionList } from '@/components/transactions/TransactionList'
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet'
import { Card, CardContent } from '@/components/ui/card'
import { currentMonthRange } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'

export default async function IncomePage() {
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

  const { from, to } = currentMonthRange()

  const [transactions, categories] = await Promise.all([
    getTransactions({ from, to, isIncome: true }),
    getCategories(),
  ])

  // Per-person totals
  const byPerson: Record<string, { name: string; total: number }> = {}
  for (const t of transactions) {
    const member2 = t.household_members as unknown as { display_name: string } | null
    const name = member2?.display_name ?? 'Unknown'
    if (!byPerson[t.paid_by]) byPerson[t.paid_by] = { name, total: 0 }
    byPerson[t.paid_by].total += Number(t.amount)
  }

  const totalIncome = Object.values(byPerson).reduce((s, p) => s + p.total, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Income</h1>
        <AddTransactionSheet
          members={allMembers ?? []}
          categories={categories}
          defaultMemberId={member?.id ?? ''}
          defaultIsIncome
          label="Add Income"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {Object.values(byPerson).map(p => (
          <Card key={p.name}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-medium">{p.name}</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(p.total)}</p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(byPerson).length > 1 && (
          <Card className="col-span-2">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-medium">Combined</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <TransactionList
        transactions={transactions as unknown as Parameters<typeof TransactionList>[0]['transactions']}
        members={allMembers ?? []}
        categories={categories}
        defaultMemberId={member?.id ?? ''}
      />
    </div>
  )
}
