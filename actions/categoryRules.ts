'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeDescription } from '@/lib/utils/categorize'

export interface CategoryRule {
  id: string
  description: string
  category_id: string | null
  created_at: string
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('category_rules')
    .select('id, description, category_id, created_at')
    .order('description') as { data: CategoryRule[] | null }
  return data ?? []
}

export async function updateCategoryRule(id: string, categoryId: string | null) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db
    .from('category_rules')
    .update({ category_id: categoryId, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/rules')
}

export async function deleteCategoryRule(id: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('category_rules').delete().eq('id', id)
  revalidatePath('/rules')
}

export async function addCategoryRule(description: string, categoryId: string | null) {
  const supabase = await createClient()
  const { data: householdData } = await supabase.rpc('get_my_household_id')
  const householdId = householdData as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('category_rules').upsert(
    { household_id: householdId, description: normalizeDescription(description), category_id: categoryId },
    { onConflict: 'household_id,description', ignoreDuplicates: false }
  )
  revalidatePath('/rules')
}
