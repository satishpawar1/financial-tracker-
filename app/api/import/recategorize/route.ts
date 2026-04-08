export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guessCategory, normalizeDescription } from '@/lib/utils/categorize'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: householdData } = await supabase.rpc('get_my_household_id')
  const householdId = householdData as string
  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)

  const cats = categories ?? []

  // ── Step 1: Learn from all already-categorized transactions ──────────────
  // Build description → category_id map from every transaction that has a category
  const { data: categorized } = await supabase
    .from('transactions')
    .select('description, category_id')
    .eq('household_id', householdId)
    .not('category_id', 'is', null)

  // Collect rules: for each description, pick the most-used category
  const freq: Record<string, Record<string, number>> = {}
  for (const tx of categorized ?? []) {
    const key = normalizeDescription(tx.description)
    if (!freq[key]) freq[key] = {}
    freq[key][tx.category_id] = (freq[key][tx.category_id] ?? 0) + 1
  }

  // Upsert learned rules into category_rules table
  const learnedRules = Object.entries(freq).map(([description, counts]) => {
    const category_id = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    return { household_id: householdId, description, category_id }
  })

  if (learnedRules.length > 0) {
    // Upsert in batches of 100
    for (let i = 0; i < learnedRules.length; i += 100) {
      await supabase
        .from('category_rules')
        .upsert(learnedRules.slice(i, i + 100), {
          onConflict: 'household_id,description',
          ignoreDuplicates: false,
        })
    }
  }

  // ── Step 2: Fetch the full rules map for lookup ───────────────────────────
  const { data: rulesRows } = await supabase
    .from('category_rules')
    .select('description, category_id')
    .eq('household_id', householdId)
    .not('category_id', 'is', null)

  const rulesMap = new Map<string, string>()
  for (const r of rulesRows ?? []) {
    rulesMap.set(r.description, r.category_id)
  }

  // ── Step 3: Apply to all uncategorized transactions ───────────────────────
  const { data: uncategorized } = await supabase
    .from('transactions')
    .select('id, description')
    .eq('household_id', householdId)
    .is('category_id', null)

  const updates: Array<{ id: string; category_id: string }> = []
  const newRules: Array<{ household_id: string; description: string; category_id: string | null }> = []

  for (const tx of uncategorized ?? []) {
    const key = normalizeDescription(tx.description)

    // DB rule first
    let categoryId = rulesMap.get(key) ?? null

    // Fall back to keyword match
    if (!categoryId) {
      categoryId = guessCategory(tx.description, cats)
      if (categoryId) {
        // Record this new keyword-matched rule for future imports
        newRules.push({ household_id: householdId, description: key, category_id: categoryId })
        rulesMap.set(key, categoryId) // avoid duplicates in same run
      } else if (!rulesMap.has(key)) {
        // Unknown description — add with null category so user can assign it once
        newRules.push({ household_id: householdId, description: key, category_id: null })
        rulesMap.set(key, '') // mark as seen
      }
    }

    if (categoryId) updates.push({ id: tx.id, category_id: categoryId })
  }

  // Save new rules
  if (newRules.length > 0) {
    for (let i = 0; i < newRules.length; i += 100) {
      await supabase
        .from('category_rules')
        .upsert(newRules.slice(i, i + 100), {
          onConflict: 'household_id,description',
          ignoreDuplicates: true,
        })
    }
  }

  // Apply category updates to transactions
  if (updates.length > 0) {
    for (let i = 0; i < updates.length; i += 50) {
      await Promise.all(
        updates.slice(i, i + 50).map(({ id, category_id }) =>
          supabase.from('transactions').update({ category_id }).eq('id', id)
        )
      )
    }
  }

  const uncategorizedCount = (uncategorized?.length ?? 0) - updates.length
  return NextResponse.json({
    learned: learnedRules.length,
    updated: updates.length,
    still_uncategorized: uncategorizedCount,
  })
}
