'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getRecurringRules() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recurring_rules')
    .select(`
      *,
      categories(id, name, color, icon),
      household_members!paid_by(id, display_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createRecurringRule(input: {
  paid_by: string
  category_id?: string | null
  amount: number
  description: string
  is_income?: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  day_of_week?: number | null
  day_of_month?: number | null
  month_of_year?: number | null
  start_date: string
  end_date?: string | null
}) {
  const supabase = await createClient()
  const householdId = await getHouseholdId(supabase)

  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/recurring')
  return data
}

export async function updateRecurringRule(
  id: string,
  input: Partial<{
    paid_by: string
    category_id: string | null
    amount: number
    description: string
    is_income: boolean
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    day_of_week: number | null
    day_of_month: number | null
    month_of_year: number | null
    start_date: string
    end_date: string | null
    is_active: boolean
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_rules').update(input).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/recurring')
}

export async function deleteRecurringRule(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/recurring')
}

export async function toggleRecurringRule(id: string, isActive: boolean) {
  return updateRecurringRule(id, { is_active: isActive })
}

// ── internal helper ──────────────────────────────────────────────────────────
async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('get_my_household_id')
  if (error || !data) throw new Error('Household not found')
  return data as string
}
