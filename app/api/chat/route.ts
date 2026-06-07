export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  getMonthlyTrends,
  getAnnualSummary,
  getUtilityBreakdown,
  getMonthlyCategoryTrends,
} from '@/actions/transactions'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function pct(a: number, b: number) {
  if (b === 0) return 'n/a'
  const change = ((a - b) / b) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

function buildSystemPrompt(
  curMonthLabel: string,
  trends: Awaited<ReturnType<typeof getMonthlyTrends>>,
  annual: Awaited<ReturnType<typeof getAnnualSummary>>,
  utilities: Awaited<ReturnType<typeof getUtilityBreakdown>>,
  catTrends: Awaited<ReturnType<typeof getMonthlyCategoryTrends>>,
  today: string,
): string {
  const trendTable = trends
    .map(t => `${t.label} | ${fmt(t.income)} | ${fmt(t.expenses)} | ${fmt(t.net)}`)
    .join('\n')

  // Category × month table — each row is one category, columns are months
  const colHeader = catTrends.monthLabels.join(' | ')
  const catRows = catTrends.categories
    .slice(0, 15)
    .map(c => {
      const cols = c.monthly.map(v => (v > 0 ? fmt(v) : '-')).join(' | ')
      return `${c.name} | ${cols}`
    })
    .join('\n')

  return `You are a personal finance assistant for a household expense tracking app. You have complete access to this household's financial data. Always cite specific dollar amounts. Format currency as $X,XXX.XX. Be concise unless the user asks for detail.

Today: ${today}
Current month being tracked: ${curMonthLabel}

## Monthly Income vs Expenses (12 months, oldest → newest)
Month | Income | Expenses | Net
${trendTable}

## Expense by Category per Month (last 12 months)
Category | ${colHeader}
${catRows}

## Year-to-Date ${annual.year}
Total Income: ${fmt(annual.totalIncome)} | Total Expenses: ${fmt(annual.totalExpenses)} | Net: ${fmt(annual.net)}
Monthly averages (${annual.monthsElapsed} months elapsed): Avg Income ${fmt(annual.avgMonthlyIncome)} | Avg Expenses ${fmt(annual.avgMonthlyExpenses)}
${utilities.length > 0 ? `
## Utility Bills by Provider (last 6 months)
${utilities.map(u => {
  const cols = u.months.map(m => `${m.label}: ${m.amount > 0 ? fmt(m.amount) : '-'}`).join(' | ')
  const spike = u.isSpike && u.pctAboveAvg !== null ? ` ⚠ SPIKE (+${u.pctAboveAvg.toFixed(0)}% above avg)` : ''
  return `- ${u.provider}${spike} | 3-mo avg: ${u.threeMonthAvg > 0 ? fmt(u.threeMonthAvg) : 'n/a'} | ${cols}`
}).join('\n')}` : ''}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { messages: ChatMessage[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages } = body
  const now = new Date()
  const year = now.getFullYear()
  const curTo = now.toISOString().split('T')[0]
  const curMonthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  try {
    const [trends, annual, utilities, catTrends] = await Promise.all([
      getMonthlyTrends(12),
      getAnnualSummary(year),
      getUtilityBreakdown(6),
      getMonthlyCategoryTrends(12),
    ])

    const systemPrompt = buildSystemPrompt(
      curMonthLabel,
      trends,
      annual,
      utilities,
      catTrends,
      curTo,
    )

    const anthropicMessages: ChatMessage[] =
      messages.length === 0
        ? [{ role: 'user', content: 'Give me a brief overview of my finances for this month and highlight anything notable compared to last month.' }]
        : messages

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const message = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ message })
  } catch (err) {
    console.error('[chat]', err)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
