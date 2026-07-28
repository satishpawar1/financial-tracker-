import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      checked: 'transactions',
      count: count ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ping failure'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
