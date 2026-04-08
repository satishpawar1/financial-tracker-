export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function parseCurrencyInput(value: string): number {
  // Strip everything except digits and decimal point
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100
}
