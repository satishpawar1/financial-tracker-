export interface ParsedTransaction {
  description: string
  amount: number
  transaction_date: string
  is_income: boolean
  notes?: string
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  skipped: number
}

// Common column name variants → canonical field
const COLUMN_MAP: Record<string, string> = {
  date: 'date',
  'transaction date': 'date',
  'trans date': 'date',
  'posted date': 'date',
  'posting date': 'date',
  amount: 'amount',
  'transaction amount': 'amount',
  debit: 'debit',
  credit: 'credit',
  description: 'description',
  'transaction description': 'description',
  memo: 'description',
  payee: 'description',
  merchant: 'description',
  narration: 'description',
  particulars: 'description',
  notes: 'notes',
  category: 'category',
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]/g, ' ')
}

export function parseCSV(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { transactions: [], skipped: 0 }

  // Parse header
  const rawHeaders = splitCSVLine(lines[0])
  const headers = rawHeaders.map(h => COLUMN_MAP[normalizeHeader(h)] ?? normalizeHeader(h))

  const transactions: ParsedTransaction[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim()
    })

    const parsed = parseRow(row)
    if (parsed) {
      transactions.push(parsed)
    } else {
      skipped++
    }
  }

  return { transactions, skipped }
}

function parseRow(row: Record<string, string>): ParsedTransaction | null {
  // Date
  const rawDate = row['date']
  if (!rawDate) return null
  const date = parseDate(rawDate)
  if (!date) return null

  // Amount — handle separate debit/credit columns
  let amount = 0
  let is_income = false

  if (row['amount']) {
    const raw = row['amount'].replace(/[$,\s]/g, '').replace(/[()]/g, '-')
    amount = Math.abs(parseFloat(raw))
    is_income = parseFloat(raw) > 0
  } else if (row['credit'] && parseFloat(row['credit'].replace(/[$,\s]/g, '')) > 0) {
    amount = parseFloat(row['credit'].replace(/[$,\s]/g, ''))
    is_income = true
  } else if (row['debit'] && parseFloat(row['debit'].replace(/[$,\s]/g, '')) > 0) {
    amount = parseFloat(row['debit'].replace(/[$,\s]/g, ''))
    is_income = false
  }

  if (!amount || isNaN(amount)) return null

  const description = row['description'] || row['memo'] || row['payee'] || 'Imported'

  return {
    description: description.trim(),
    amount,
    transaction_date: date,
    is_income,
    notes: row['notes'] || undefined,
  }
}

function parseDate(raw: string): string | null {
  // Try common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, MM-DD-YYYY
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
  ]

  for (const fmt of formats) {
    const m = raw.match(fmt)
    if (!m) continue
    let year: string, month: string, day: string

    if (raw.includes('-') && m[1].length === 4) {
      ;[, year, month, day] = m
    } else {
      ;[, month, day, year] = m
    }

    const d = new Date(`${year}-${month}-${day}`)
    if (!isNaN(d.getTime())) {
      return `${year}-${month}-${day}`
    }
  }

  // Fallback: let JS try
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  return null
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
