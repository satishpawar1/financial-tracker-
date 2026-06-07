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
  utility_type?: string | null
  utility_provider?: string | null
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
    utility_type?: string | null
    utility_provider?: string | null
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

export async function getAnnualSummary(year: number) {
  const supabase = await createClient()
  const from = `${year}-01-01`
  const to = `${year}-12-31`

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

  const now = new Date()
  const isCurrentYear = year === now.getFullYear()
  // For current year use elapsed months; for past years use 12
  const monthsElapsed = isCurrentYear ? now.getMonth() + 1 : 12

  return {
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    monthsElapsed,
    avgMonthlyIncome: monthsElapsed > 0 ? totalIncome / monthsElapsed : 0,
    avgMonthlyExpenses: monthsElapsed > 0 ? totalExpenses / monthsElapsed : 0,
    isCurrentYear,
    year,
    byPerson,
  }
}

export async function getCategoryTrend(categoryId: string, months: number = 12) {
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
      .select('amount')
      .eq('category_id', categoryId)
      .eq('is_income', false)
      .gte('transaction_date', from)
      .lte('transaction_date', to)

    const total = (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0)

    results.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      amount: total,
    })
  }

  return results
}

export interface UtilityProviderTrend {
  provider: string
  months: Array<{ month: string; label: string; amount: number }>
  threeMonthAvg: number
  currentMonthAmount: number
  isSpike: boolean
  pctAboveAvg: number | null
}

export type UtilityBreakdownResult = UtilityProviderTrend[]

export async function getUtilityBreakdown(months: number = 6): Promise<UtilityBreakdownResult> {
  const supabase = await createClient()

  const { data: cat, error: catError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Utilities')
    .single()

  if (catError || !cat) return []

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(1)
  startDate.setMonth(now.getMonth() - (months - 1))
  const from = startDate.toISOString().split('T')[0]
  const to = now.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, description, notes, transaction_date, utility_type, utility_provider')
    .eq('category_id', cat.id)
    .eq('is_income', false)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const monthSlots: Array<{ month: string; label: string }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    monthSlots.push({
      month: `${y}-${String(m).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
    })
  }

  const providerMap = new Map<string, Map<string, number>>()
  for (const t of data) {
    // Prefer structured fields; fall back to pattern matching for older transactions
    const provider = resolveUtilityLabel(
      t.utility_type as string | null,
      t.utility_provider as string | null,
      t.description,
      t.notes as string | null,
    )
    const monthKey = (t.transaction_date as string).slice(0, 7)
    if (!providerMap.has(provider)) providerMap.set(provider, new Map())
    const monthMap = providerMap.get(provider)!
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + Number(t.amount))
  }

  const result: UtilityBreakdownResult = []
  for (const [provider, monthMap] of providerMap.entries()) {
    const monthData = monthSlots.map(slot => ({
      month: slot.month,
      label: slot.label,
      amount: monthMap.get(slot.month) ?? 0,
    }))

    const prior3 = monthData.slice(-4, -1).filter(m => m.amount > 0)
    const threeMonthAvg =
      prior3.length > 0 ? prior3.reduce((sum, m) => sum + m.amount, 0) / prior3.length : 0
    const currentMonthAmount = monthData[monthData.length - 1].amount
    const isSpike = threeMonthAvg > 0 && currentMonthAmount > threeMonthAvg * 1.25
    const pctAboveAvg = threeMonthAvg > 0 ? ((currentMonthAmount / threeMonthAvg) - 1) * 100 : null

    result.push({ provider, months: monthData, threeMonthAvg, currentMonthAmount, isSpike, pctAboveAvg })
  }

  return result.sort((a, b) => b.currentMonthAmount - a.currentMonthAmount)
}

export interface UtilityBulkTransaction {
  id: string
  description: string
  notes: string | null
  amount: number
  transaction_date: string
  utility_type: string | null
  utility_provider: string | null
  suggestedType: string | null
  suggestedProvider: string | null
}

export interface UtilityBulkGroup {
  key: string
  transactions: UtilityBulkTransaction[]
  suggestedType: string | null
  suggestedProvider: string | null
  totalAmount: number
  alreadyTagged: number
}

export async function getUtilitiesForBulkEdit(): Promise<UtilityBulkGroup[]> {
  const supabase = await createClient()

  const { data: cat, error: catError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Utilities')
    .single()

  if (catError || !cat) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, notes, amount, transaction_date, utility_type, utility_provider')
    .eq('category_id', cat.id)
    .eq('is_income', false)
    .order('transaction_date', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const { inferUtilityFields } = await import('@/lib/utils/utility-types')

  const groupMap = new Map<string, UtilityBulkGroup>()

  for (const t of data) {
    const { suggestedType, suggestedProvider } = inferUtilityFields(
      t.description,
      t.notes as string | null,
    )
    const key = suggestedProvider ?? t.description.trim().toLowerCase()

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        transactions: [],
        suggestedType,
        suggestedProvider,
        totalAmount: 0,
        alreadyTagged: 0,
      })
    }
    const group = groupMap.get(key)!
    group.transactions.push({
      id: t.id,
      description: t.description,
      notes: t.notes as string | null,
      amount: Number(t.amount),
      transaction_date: t.transaction_date as string,
      utility_type: t.utility_type as string | null,
      utility_provider: t.utility_provider as string | null,
      suggestedType,
      suggestedProvider,
    })
    group.totalAmount += Number(t.amount)
    if (t.utility_type) group.alreadyTagged++
  }

  return Array.from(groupMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
}

export async function bulkUpdateUtilityFields(
  updates: Array<{ id: string; utility_type: string | null; utility_provider: string | null }>,
) {
  const supabase = await createClient()

  await Promise.all(
    updates.map(({ id, utility_type, utility_provider }) =>
      supabase
        .from('transactions')
        .update({ utility_type: utility_type || null, utility_provider: utility_provider || null })
        .eq('id', id),
    ),
  )

  revalidatePath('/', 'layout')
}

export async function getMonthlyCategoryTrends(months: number = 12) {
  const supabase = await createClient()

  const monthSlots: Array<{ month: string; label: string; from: string; to: string }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    monthSlots.push({
      month: `${y}-${String(m).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      from: `${y}-${String(m).padStart(2, '0')}-01`,
      to: new Date(y, m, 0).toISOString().split('T')[0],
    })
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, transaction_date, categories(name, color)')
    .eq('is_income', false)
    .gte('transaction_date', monthSlots[0].from)
    .lte('transaction_date', monthSlots[monthSlots.length - 1].to)

  if (error) throw new Error(error.message)

  const categoryMap = new Map<string, { color: string; monthTotals: Map<string, number> }>()
  for (const t of data ?? []) {
    const cat = t.categories as unknown as { name: string; color: string } | null
    const name = cat?.name ?? 'Uncategorized'
    const color = cat?.color ?? '#94a3b8'
    const monthKey = (t.transaction_date as string).slice(0, 7)
    if (!categoryMap.has(name)) categoryMap.set(name, { color, monthTotals: new Map() })
    const entry = categoryMap.get(name)!
    entry.monthTotals.set(monthKey, (entry.monthTotals.get(monthKey) ?? 0) + Number(t.amount))
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, { color, monthTotals }]) => ({
      name,
      color,
      monthly: monthSlots.map(s => monthTotals.get(s.month) ?? 0),
    }))
    .sort((a, b) => b.monthly.reduce((s, v) => s + v, 0) - a.monthly.reduce((s, v) => s + v, 0))

  return {
    monthLabels: monthSlots.map(s => s.label),
    categories,
  }
}

// ── internal helpers ─────────────────────────────────────────────────────────

const PROVIDER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Specific company names — checked first
  { pattern: /pg&?e|pacific gas/i, label: 'PG&E' },
  { pattern: /con\s?ed|consolidated edison/i, label: 'Con Edison' },
  { pattern: /duke energy/i, label: 'Duke Energy' },
  { pattern: /xcel energy/i, label: 'Xcel Energy' },
  { pattern: /southern\s?company/i, label: 'Southern Company' },
  { pattern: /nicor\s?gas/i, label: 'Nicor Gas' },
  { pattern: /socalgas|so\s?cal\s?gas/i, label: 'SoCal Gas' },
  { pattern: /columbia\s?gas/i, label: 'Columbia Gas' },
  { pattern: /ameren/i, label: 'Ameren' },
  { pattern: /pseg/i, label: 'PSE&G' },
  { pattern: /national\s?grid/i, label: 'National Grid' },
  { pattern: /comcast|xfinity/i, label: 'Comcast/Xfinity' },
  { pattern: /spectrum/i, label: 'Spectrum' },
  { pattern: /cox\s*(cable|communications)/i, label: 'Cox' },
  { pattern: /verizon/i, label: 'Verizon' },
  { pattern: /at&?t/i, label: 'AT&T' },
  { pattern: /t-?mobile/i, label: 'T-Mobile' },
  { pattern: /waste\s*management|wm\s+inc/i, label: 'Waste Management' },
  // Generic utility-type keywords — checked after company names
  { pattern: /\belectric(ity|al)?\b/i, label: 'Electricity' },
  { pattern: /\bwater\b/i, label: 'Water' },
  { pattern: /\bnatural\s*gas\b|\bgas\s*bill\b|\bgas\s*utility\b/i, label: 'Gas' },
  { pattern: /\binternet\b|\bbroadband\b|\bwifi\b/i, label: 'Internet' },
  { pattern: /\bcell\s*(phone)?\b|\bmobile\s*(plan|bill)?\b|\bwireless\b/i, label: 'Phone' },
  { pattern: /\bcable\s*(tv|bill)?\b|\btv\s*bill\b/i, label: 'Cable/TV' },
  { pattern: /\bsewer\b/i, label: 'Sewer' },
  { pattern: /\btrash\b|\bgarbage\b|\brecycl/i, label: 'Trash' },
]

function resolveUtilityLabel(
  utilityType: string | null,
  utilityProvider: string | null,
  description: string,
  notes: string | null,
): string {
  if (utilityType) {
    return utilityProvider ? `${utilityType} (${utilityProvider})` : utilityType
  }
  return normalizeUtilityProvider(description, notes)
}

function normalizeUtilityProvider(description: string, notes: string | null): string {
  const combined = [description, notes].filter(Boolean).join(' ')
  for (const { pattern, label } of PROVIDER_PATTERNS) {
    if (pattern.test(combined)) return label
  }
  // Fallback: use the first meaningful word from description
  return description.split(/\s+/)[0].toUpperCase().slice(0, 20)
}

async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('get_my_household_id')
  if (error || !data) throw new Error('Household not found')
  return data as string
}
