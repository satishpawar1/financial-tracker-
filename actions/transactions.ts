'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkBudgetsAfterTransaction } from '@/lib/notifications/budget-checker'

export interface TransactionFilters {
  from?: string
  to?: string
  categoryId?: string
  paidBy?: string
  isIncome?: boolean
  search?: string
  uncategorized?: boolean
  limit?: number
  offset?: number
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select(`
      *,
      categories(id, name, color, icon),
      household_members!paid_by(id, display_name)
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.from) query = query.gte('transaction_date', filters.from)
  if (filters.to) query = query.lte('transaction_date', filters.to)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.paidBy) query = query.eq('paid_by', filters.paidBy)
  if (filters.isIncome !== undefined) query = query.eq('is_income', filters.isIncome)
  if (filters.uncategorized) query = query.is('category_id', null)
  if (filters.search) query = query.ilike('description', `%${filters.search}%`)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function createTransaction(input: {
  paid_by: string
  category_id?: string | null
  amount: number
  description: string
  transaction_date: string
  is_income?: boolean
  notes?: string | null
}) {
  const supabase = await createClient()
  const householdId = await getHouseholdId(supabase)

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (!input.is_income) {
    await checkBudgetsAfterTransaction(householdId)
  }

  revalidatePath('/', 'layout')
  return data
}

export async function updateTransaction(
  id: string,
  input: {
    paid_by?: string
    category_id?: string | null
    amount?: number
    description?: string
    transaction_date?: string
    is_income?: boolean
    notes?: string | null
  }
) {
  const supabase = await createClient()
  const householdId = await getHouseholdId(supabase)

  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  await checkBudgetsAfterTransaction(householdId)
  revalidatePath('/', 'layout')
  return data
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function getMonthlySummary(year: number, month: number) {
  const supabase = await createClient()
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, is_income, paid_by, household_members!paid_by(display_name)')
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  if (error) throw new Error(error.message)

  let totalIncome = 0
  let totalExpenses = 0
  const byPerson: Record<string, { income: number; expenses: number; name: string }> = {}

  for (const t of data) {
    const amount = Number(t.amount)
    const memberName = (t.household_members as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
    if (!byPerson[t.paid_by]) {
      byPerson[t.paid_by] = { income: 0, expenses: 0, name: memberName }
    }
    if (t.is_income) {
      totalIncome += amount
      byPerson[t.paid_by].income += amount
    } else {
      totalExpenses += amount
      byPerson[t.paid_by].expenses += amount
    }
  }

  return {
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    byPerson,
  }
}

export async function getCategoryBreakdown(from: string, to: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, categories(id, name, color)')
    .eq('is_income', false)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  if (error) throw new Error(error.message)

  const byCategory: Record<string, { name: string; color: string; total: number }> = {}

  for (const t of data) {
    const cat = t.categories as unknown as { id: string; name: string; color: string } | null
    const key = cat?.name ?? 'Uncategorized'
    if (!byCategory[key]) {
      byCategory[key] = { name: key, color: cat?.color ?? '#94a3b8', total: 0 }
    }
    byCategory[key].total += Number(t.amount)
  }

  return Object.values(byCategory).sort((a, b) => b.total - a.total)
}

export async function getMonthlyTrends(months: number = 6) {
  const supabase = await createClient()
  const results = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('transactions')
      .select('amount, is_income')
      .gte('transaction_date', from)
      .lte('transaction_date', to)

    let income = 0
    let expenses = 0
    for (const t of data ?? []) {
      if (t.is_income) income += Number(t.amount)
      else expenses += Number(t.amount)
    }

    results.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      income,
      expenses,
      net: income - expenses,
    })
  }

  return results
}

// ── internal helper ──────────────────────────────────────────────────────────
async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('get_my_household_id')
  if (error || !data) throw new Error('Household not found')
  return data as string
}
