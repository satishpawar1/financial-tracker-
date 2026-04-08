import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateOccurrences } from '@/lib/recurring/generator'

// Called by Vercel Cron daily, and on-demand from the dashboard
export async function POST(request: NextRequest) {
  // Verify cron secret when called by Vercel scheduler
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow authenticated users to trigger manually
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date()

  // Fetch all active rules that haven't been generated today
  const todayStr = today.toISOString().split('T')[0]
  const { data: rules, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('is_active', true)
    .or(`last_generated.is.null,last_generated.lt.${todayStr}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rules?.length) return NextResponse.json({ generated: 0 })

  let totalGenerated = 0

  for (const rule of rules) {
    const occurrences = generateOccurrences(rule, today)
    if (!occurrences.length) {
      // Still update last_generated to today so we don't keep checking
      await supabase
        .from('recurring_rules')
        .update({ last_generated: todayStr })
        .eq('id', rule.id)
      continue
    }

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(occurrences)

    if (!insertError) {
      await supabase
        .from('recurring_rules')
        .update({ last_generated: todayStr })
        .eq('id', rule.id)
      totalGenerated += occurrences.length
    }
  }

  return NextResponse.json({ generated: totalGenerated })
}
