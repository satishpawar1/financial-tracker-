import type { ParseResult } from './csv-parser'

// Dynamically imported server-side only
export async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { transactions: [], skipped: 0 }

  const sheet = workbook.Sheets[sheetName]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
  })

  if (!rows.length) return { transactions: [], skipped: 0 }

  // Normalize header keys
  const COLUMN_MAP: Record<string, string> = {
    date: 'date',
    'transaction date': 'date',
    'trans date': 'date',
    amount: 'amount',
    debit: 'debit',
    credit: 'credit',
    description: 'description',
    memo: 'description',
    payee: 'description',
    narration: 'description',
    notes: 'notes',
  }

  function normalizeKey(k: string): string {
    return k.trim().toLowerCase().replace(/[_-]/g, ' ')
  }

  const transactions = []
  let skipped = 0

  for (const raw of rows) {
    const row: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      const canonical = COLUMN_MAP[normalizeKey(k)] ?? normalizeKey(k)
      row[canonical] = String(v ?? '').trim()
    }

    // Date
    const rawDate = row['date']
    if (!rawDate) { skipped++; continue }
    const date = parseDate(rawDate)
    if (!date) { skipped++; continue }

    // Amount
    let amount = 0
    let is_income = false

    if (row['amount']) {
      const clean = row['amount'].replace(/[$,\s]/g, '').replace(/[()]/g, '-')
      amount = Math.abs(parseFloat(clean))
      is_income = parseFloat(clean) > 0
    } else if (row['credit'] && parseFloat(row['credit'].replace(/[$,\s]/g, '')) > 0) {
      amount = parseFloat(row['credit'].replace(/[$,\s]/g, ''))
      is_income = true
    } else if (row['debit'] && parseFloat(row['debit'].replace(/[$,\s]/g, '')) > 0) {
      amount = parseFloat(row['debit'].replace(/[$,\s]/g, ''))
      is_income = false
    }

    if (!amount || isNaN(amount)) { skipped++; continue }

    const description = row['description'] || 'Imported'

    transactions.push({
      description,
      amount,
      transaction_date: date,
      is_income,
      notes: row['notes'] || undefined,
    })
  }

  return { transactions, skipped }
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return null
}
