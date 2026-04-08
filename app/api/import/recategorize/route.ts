export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guessCategory } from '@/lib/utils/categorize'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: householdData } = await supabase.rpc('get_my_household_id')
  const householdId = householdData as string
  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  // Fetch all uncategorized transactions for this household
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, description')
    .eq('household_id', householdId)
    .is('category_id', null)

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  if (!transactions?.length) return NextResponse.json({ updated: 0 })

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)

  // Build updates for transactions that match a category
  const updates: Array<{ id: string; category_id: string }> = []
  for (const tx of transactions) {
    const categoryId = guessCategory(tx.description, categories ?? [])
    if (categoryId) updates.push({ id: tx.id, category_id: categoryId })
  }

  if (!updates.length) return NextResponse.json({ updated: 0 })

  // Update in batches of 50 to avoid query size limits
  const BATCH = 50
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    await Promise.all(
      batch.map(({ id, category_id }) =>
        supabase.from('transactions').update({ category_id }).eq('id', id)
      )
    )
  }

  return NextResponse.json({ updated: updates.length, total: transactions.length })
}
