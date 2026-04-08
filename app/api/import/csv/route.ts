export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/parsers/csv-parser'
import { guessCategory, normalizeDescription } from '@/lib/utils/categorize'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: householdData } = await supabase.rpc('get_my_household_id')
  const householdId = householdData as string
  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const { data: member } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 400 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const { transactions, skipped } = parseCSV(text)

  if (!transactions.length) {
    return NextResponse.json({ imported: 0, skipped, message: 'No parseable transactions found' })
  }

  // Fetch categories and existing rules
  const { data: categories } = await supabase
    .from('categories').select('id, name').eq('household_id', householdId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: rulesRows } = await db
    .from('category_rules')
    .select('description, category_id')
    .eq('household_id', householdId)
    .not('category_id', 'is', null) as { data: Array<{ description: string; category_id: string }> | null }

  const rulesMap = new Map<string, string>()
  for (const r of rulesRows ?? []) rulesMap.set(r.description, r.category_id)

  const cats = categories ?? []
  const newRules: Array<{ household_id: string; description: string; category_id: string | null }> = []

  // Resolve category for each transaction
  const rows = transactions.map(t => {
    const key = normalizeDescription(t.description)
    let categoryId = rulesMap.get(key) ?? null

    if (!categoryId) {
      categoryId = guessCategory(t.description, cats)
      if (!rulesMap.has(key)) {
        newRules.push({ household_id: householdId, description: key, category_id: categoryId })
        rulesMap.set(key, categoryId ?? '') // mark seen
      }
    }

    return {
      ...t,
      household_id: householdId,
      paid_by: member.id,
      import_source: 'csv' as const,
      category_id: categoryId,
    }
  })

  // Create import batch
  const { data: batch } = await supabase
    .from('import_batches')
    .insert({
      household_id: householdId,
      imported_by: user.id,
      source: 'csv',
      filename: file.name,
      row_count: transactions.length,
      skipped,
    })
    .select()
    .single()

  const finalRows = rows.map(r => ({ ...r, import_batch_id: batch?.id }))
  const { error } = await supabase.from('transactions').insert(finalRows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save new rules discovered in this import
  if (newRules.length > 0) {
    for (let i = 0; i < newRules.length; i += 100) {
      await db.from('category_rules').upsert(newRules.slice(i, i + 100), {
        onConflict: 'household_id,description',
        ignoreDuplicates: true,
      })
    }
  }

  return NextResponse.json({ imported: transactions.length, skipped })
}
