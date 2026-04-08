'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function createCategory(input: {
  name: string
  color: string
  icon: string
}) {
  const supabase = await createClient()
  const householdId = await getHouseholdId(supabase)

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, household_id: householdId, is_system: false })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
  return data
}

export async function updateCategory(
  id: string,
  input: { name?: string; color?: string; icon?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

// ── internal helper ──────────────────────────────────────────────────────────
async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('get_my_household_id')
  if (error || !data) throw new Error('Household not found')
  return data as string
}
