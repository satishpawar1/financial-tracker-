'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { monthKey } from '@/lib/utils/dates'

export async function getBudgetsWithSpend() {
  const supabase = await createClient()
  const month = monthKey()
  const [year, m] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const monthEnd = new Date(year, m, 0).toISOString().split('T')[0]

  const [{ data: budgets, error: bErr }, { data: spending, error: sErr }] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, categories(id, name, color, icon)')
      .order('created_at'),
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('is_income', false)
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd),
  ])

  if (bErr) throw new Error(bErr.message)
  if (sErr) throw new Error(sErr.message)

  const spendByCategory: Record<string, number> = {}
  for (const t of spending ?? []) {
    if (!t.category_id) continue
    spendByCategory[t.category_id] = (spendByCategory[t.category_id] ?? 0) + Number(t.amount)
  }

  return (budgets ?? []).map(b => ({
    ...b,
    spent: spendByCategory[b.category_id] ?? 0,
    percentage: Math.min(
      Math.round(((spendByCategory[b.category_id] ?? 0) / Number(b.amount)) * 100),
      100
    ),
  }))
}

export async function createBudget(input: { category_id: string; amount: number }) {
  const supabase = await createClient()
  const householdId = await getHouseholdId(supabase)

  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/budgets')
  return data
}

export async function updateBudget(id: string, input: { amount: number }) {
  const supabase = await createClient()
  const { error } = await supabase.from('budgets').update(input).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/budgets')
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/budgets')
}

// ── internal helper ──────────────────────────────────────────────────────────
async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('get_my_household_id')
  if (error || !data) throw new Error('Household not found')
  return data as string
}
