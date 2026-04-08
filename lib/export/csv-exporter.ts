import type { Transaction } from '@/types/database.types'

type TransactionWithRelations = Transaction & {
  categories?: { name: string } | null
  household_members?: { display_name: string } | null
}

export function exportToCSV(transactions: TransactionWithRelations[]): string {
  const headers = [
    'Date',
    'Description',
    'Amount',
    'Type',
    'Category',
    'Paid By',
    'Notes',
  ]

  const rows = transactions.map(t => [
    t.transaction_date,
    `"${(t.description ?? '').replace(/"/g, '""')}"`,
    t.amount,
    t.is_income ? 'Income' : 'Expense',
    `"${(t.categories?.name ?? '').replace(/"/g, '""')}"`,
    `"${(t.household_members?.display_name ?? '').replace(/"/g, '""')}"`,
    `"${(t.notes ?? '').replace(/"/g, '""')}"`,
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}
