export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/parsers/csv-parser'

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

  // Bulk insert transactions
  const rows = transactions.map(t => ({
    ...t,
    household_id: householdId,
    paid_by: member.id,
    import_source: 'csv' as const,
    import_batch_id: batch?.id,
  }))

  const { error } = await supabase.from('transactions').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: transactions.length, skipped })
}
