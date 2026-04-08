import type { ParseResult, ParsedTransaction } from './csv-parser'

export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // Disable worker (server-side)
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const uint8Array = new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true })
  const pdf = await loadingTask.promise

  const allLines: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Group text items by approximate Y position (same line = within 3px)
    const lineMap: Map<number, string[]> = new Map()
    for (const item of textContent.items) {
      if (!('str' in item)) continue
      const y = Math.round((item as { transform: number[] }).transform[5] / 3) * 3
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y)!.push((item as { str: string }).str)
    }

    // Sort lines by Y position (descending = top to bottom)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)
    for (const y of sortedYs) {
      const line = lineMap.get(y)!.join(' ').trim()
      if (line) allLines.push(line)
    }
  }

  return extractTransactions(allLines)
}

function extractTransactions(lines: string[]): ParseResult {
  const transactions: ParsedTransaction[] = []
  let skipped = 0

  // Detect statement year
  let statementYear = new Date().getFullYear()
  for (const line of lines) {
    const yearMatch = line.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      statementYear = parseInt(yearMatch[1])
      break
    }
  }

  // Citi format: MM/DD  MM/DD  DESCRIPTION  AMOUNT
  const citiTwo = /^(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-−]?\$?[\d,]+\.\d{2})\s*$/
  // Single date: MM/DD  DESCRIPTION  AMOUNT
  const singleDate = /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-−]?\$?[\d,]+\.\d{2})\s*$/
  // Generic: any date pattern + amount at end
  const generic = /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+?)\s+([-−]?\$?[\d,]+\.\d{2})\s*$/

  const skipKeywords = /total|balance|minimum|payment due|credit limit|available|previous|new balance|interest|fee|annual/i

  for (const line of lines) {
    if (skipKeywords.test(line)) continue

    // Try Citi two-date format
    let match = line.match(citiTwo)
    if (match) {
      const [, transDate, , desc, rawAmt] = match
      const date = parseDate(transDate, statementYear)
      if (!date) { skipped++; continue }
      const { amount, is_income } = parseAmount(rawAmt)
      if (!amount) { skipped++; continue }
      transactions.push({ description: cleanDesc(desc), amount, transaction_date: date, is_income })
      continue
    }

    // Try single date
    match = line.match(singleDate)
    if (match) {
      const [, rawDate, desc, rawAmt] = match
      const date = parseDate(rawDate, statementYear)
      if (!date) { skipped++; continue }
      const { amount, is_income } = parseAmount(rawAmt)
      if (!amount) { skipped++; continue }
      transactions.push({ description: cleanDesc(desc), amount, transaction_date: date, is_income })
      continue
    }

    // Generic fallback
    match = line.match(generic)
    if (match) {
      const [, rawDate, desc, rawAmt] = match
      const date = parseDate(rawDate, statementYear)
      if (!date) { skipped++; continue }
      const { amount, is_income } = parseAmount(rawAmt)
      if (!amount) { skipped++; continue }
      transactions.push({ description: cleanDesc(desc), amount, transaction_date: date, is_income })
      continue
    }

    skipped++
  }

  return { transactions, skipped }
}

function parseAmount(raw: string): { amount: number; is_income: boolean } {
  const clean = raw.replace(/[$,\s]/g, '').replace('−', '-')
  const val = parseFloat(clean)
  if (isNaN(val) || val === 0) return { amount: 0, is_income: false }
  // On credit card statements: positive = charge (expense), negative = payment (income)
  return { amount: Math.abs(val), is_income: val < 0 }
}

function cleanDesc(desc: string): string {
  return desc.replace(/\s+/g, ' ').replace(/[*#]/g, '').trim() || 'Imported'
}

function parseDate(raw: string, year: number): string | null {
  const mdMatch = raw.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (mdMatch) {
    const [, m, d] = mdMatch
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch
    const fullYear = y.length === 2 ? `20${y}` : y
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}
