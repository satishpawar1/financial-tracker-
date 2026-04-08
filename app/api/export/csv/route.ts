import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportToCSV } from '@/lib/export/csv-exporter'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('transactions')
    .select(`
      *,
      categories(name),
      household_members!paid_by(display_name)
    `)
    .order('transaction_date', { ascending: false })

  if (from) query = query.gte('transaction_date', from)
  if (to) query = query.lte('transaction_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csv = exportToCSV((data ?? []) as any)
  const filename = `transactions${from ? `_${from}` : ''}${to ? `_to_${to}` : ''}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
