import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  isValid,
} from 'date-fns'

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, fmt) : ''
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  return {
    from: toISODate(startOfMonth(now)),
    to: toISODate(endOfMonth(now)),
  }
}

export function monthLabel(date: Date = new Date()): string {
  return format(date, 'MMMM yyyy')
}

export function monthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM')
}
