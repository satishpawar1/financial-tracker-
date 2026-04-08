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

  // Try Citi-specific parser first
  const citiResult = parseCitiStatement(lines)
  if (citiResult.transactions.length > 0) {
    return citiResult
  }

  // Fallback: generic date + amount pattern
  const dateAmountPattern =
    /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})\s*$/

  for (const line of lines) {
    const match = line.match(dateAmountPattern)
    if (!match) { skipped++; continue }

    const [, rawDate, rawDesc, rawAmount] = match

    const date = parseDate(rawDate, new Date().getFullYear())
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

/**
 * Citi credit card statement parser.
 *
 * Citi statement lines come in these forms:
 *   MM/DD  MM/DD  DESCRIPTION          $123.45   (charge)
 *   MM/DD  MM/DD  DESCRIPTION          -$123.45  (credit/payment)
 *   MM/DD  MM/DD  DESCRIPTION          123.45
 *
 * Sometimes the year is absent (MM/DD only) — we infer from statement context.
 */
function parseCitiStatement(lines: string[]): ParseResult {
  const transactions: ParsedTransaction[] = []
  let skipped = 0

  // Detect statement year from lines like "Statement Period: 03/01/2024 - 03/31/2024"
  let statementYear = new Date().getFullYear()
  for (const line of lines) {
    const yearMatch = line.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      statementYear = parseInt(yearMatch[1])
      break
    }
  }

  // Citi transaction pattern:
  // Two MM/DD dates, then description, then amount (optionally with $, possibly negative)
  const citiPattern =
    /^(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-−]?\$?[\d,]+\.\d{2})\s*$/

  // Single date pattern (some Citi formats)
  const singleDatePattern =
    /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-−]?\$?[\d,]+\.\d{2})\s*$/

  // Track whether we're in the transactions section
  let inTransactions = false

  for (const line of lines) {
    // Start parsing after header keywords
    if (/transactions|activity|purchases|payments/i.test(line)) {
      inTransactions = true
      continue
    }

    // Skip summary/footer lines
    if (/total|balance|minimum|payment due|credit limit|available/i.test(line)) {
      continue
    }

    // Try two-date Citi format
    let match = line.match(citiPattern)
    if (match) {
      const [, transDate, , rawDesc, rawAmount] = match
      const date = parseDate(transDate, statementYear)
      if (!date) { skipped++; continue }

      const cleanAmount = rawAmount.replace(/[$,\s−]/g, '').replace('−', '-')
      const amount = parseFloat(cleanAmount)
      if (isNaN(amount) || amount === 0) { skipped++; continue }

      // On a credit card statement, positive = charge (expense), negative = payment/credit (income)
      transactions.push({
        description: cleanDescription(rawDesc),
        amount: Math.abs(amount),
        transaction_date: date,
        is_income: amount < 0,
      })
      continue
    }

    // Try single-date format
    if (inTransactions) {
      match = line.match(singleDatePattern)
      if (match) {
        const [, rawDate, rawDesc, rawAmount] = match
        const date = parseDate(rawDate, statementYear)
        if (!date) { skipped++; continue }

        const cleanAmount = rawAmount.replace(/[$,\s]/g, '').replace('−', '-')
        const amount = parseFloat(cleanAmount)
        if (isNaN(amount) || amount === 0) { skipped++; continue }

        transactions.push({
          description: cleanDescription(rawDesc),
          amount: Math.abs(amount),
          transaction_date: date,
          is_income: amount < 0,
        })
        continue
      }
    }
  }

  return { transactions, skipped }
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\s+/g, ' ')
    .replace(/[*#]/g, '')
    .trim() || 'Imported'
}

function parseDate(raw: string, year: number): string | null {
  if (!raw) return null

  // MM/DD (no year)
  const mdMatch = raw.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (mdMatch) {
    const [, m, d] = mdMatch
    const month = m.padStart(2, '0')
    const day = d.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // MM/DD/YYYY or MM/DD/YY
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch
    const fullYear = y.length === 2 ? `20${y}` : y
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return raw

  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return null
}
