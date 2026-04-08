import type { ParseResult, ParsedTransaction } from './csv-parser'

export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const { text } = await pdfParse(buffer)
  return extractTransactionsFromText(text)
}

function extractTransactionsFromText(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const transactions: ParsedTransaction[] = []
  let skipped = 0

  // Pattern: any line containing a date + amount
  // Handles formats like: 01/15/2024   Coffee Shop   -$25.00
  const dateAmountPattern =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d{0,2})\s*$/

  for (const line of lines) {
    const match = line.match(dateAmountPattern)
    if (!match) { skipped++; continue }

    const [, rawDate, rawDesc, rawAmount] = match

    const date = parseDate(rawDate)
    if (!date) { skipped++; continue }

    const cleanAmount = rawAmount.replace(/[$,\s]/g, '').replace(/[()]/g, '-')
    const amount = parseFloat(cleanAmount)
    if (isNaN(amount) || amount === 0) { skipped++; continue }

    transactions.push({
      description: rawDesc.trim() || 'Imported',
      amount: Math.abs(amount),
      transaction_date: date,
      is_income: amount > 0,
    })
  }

  return { transactions, skipped }
}

function parseDate(raw: string): string | null {
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  // Try MM/DD/YYYY
  const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    let [, month, day, year] = m
    if (year.length === 2) year = `20${year}`
    const date = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  return null
}
