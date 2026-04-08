import { createClient } from '@/lib/supabase/server'
import { monthKey } from '@/lib/utils/dates'

export async function checkBudgetsAfterTransaction(householdId: string) {
  const supabase = await createClient()
  const month = monthKey()
  const monthStart = `${month}-01`
  const [year, m] = month.split('-').map(Number)
  const monthEnd = new Date(year, m, 0).toISOString().split('T')[0]

  // Get all budgets for this household
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, category_id, amount, categories(name)')
    .eq('household_id', householdId)

  if (!budgets?.length) return

  // Get current month spending per category
  const { data: spending } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('household_id', householdId)
    .eq('is_income', false)
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)

  if (!spending) return

  // Sum per category
  const spendByCategory: Record<string, number> = {}
  for (const row of spending) {
    if (!row.category_id) continue
    spendByCategory[row.category_id] = (spendByCategory[row.category_id] ?? 0) + Number(row.amount)
  }

  // Get all members to notify
  const { data: members } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  if (!members?.length) return

  // Check each budget
  for (const budget of budgets) {
    const spent = spendByCategory[budget.category_id] ?? 0
    const pct = spent / Number(budget.amount)
    const categoryName = (budget.categories as unknown as { name: string } | null)?.name ?? 'Unknown'

    let notifType: 'budget_warning' | 'budget_exceeded' | null = null
    let title = ''
    let body = ''

    if (pct >= 1) {
      notifType = 'budget_exceeded'
      title = `Budget exceeded: ${categoryName}`
      body = `You've spent $${spent.toFixed(2)} of your $${Number(budget.amount).toFixed(2)} ${categoryName} budget this month.`
    } else if (pct >= 0.8) {
      notifType = 'budget_warning'
      title = `Budget warning: ${categoryName}`
      body = `You've used ${Math.round(pct * 100)}% of your $${Number(budget.amount).toFixed(2)} ${categoryName} budget this month.`
    }

    if (!notifType) continue

    // Insert a notification per member (unique constraint prevents duplicates)
    for (const member of members) {
      await supabase.from('notifications').upsert(
        {
          household_id: householdId,
          user_id: member.user_id,
          type: notifType,
          title,
          body,
          metadata: {
            category_id: budget.category_id,
            budget_id: budget.id,
            spent,
            limit: budget.amount,
            month,
          },
          is_read: false,
        },
        {
          onConflict: 'household_id,type,metadata->category_id,metadata->month',
          ignoreDuplicates: true,
        }
      )
    }
  }
}
