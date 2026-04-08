import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  isAfter,
  isBefore,
  isEqual,
  format,
  getDay,
  getDate,
  differenceInDays,
} from 'date-fns'
import type { RecurringRule } from '@/types/database.types'

export interface GeneratedTransaction {
  household_id: string
  paid_by: string
  category_id: string | null
  amount: number
  description: string
  transaction_date: string
  is_income: boolean
  recurring_id: string
}

/**
 * Given a recurring rule, returns all transaction dates that should be generated
 * between (lastGenerated + 1 day) and today (inclusive).
 * Idempotent — safe to call multiple times.
 */
export function generateOccurrences(
  rule: RecurringRule,
  today: Date = new Date()
): GeneratedTransaction[] {
  if (!rule.is_active) return []

  const startDate = parseISO(rule.start_date)
  const endDate = rule.end_date ? parseISO(rule.end_date) : null
  const lastGenerated = rule.last_generated ? parseISO(rule.last_generated) : null

  // Generate from the day after last_generated, or from start_date if never generated
  const generateFrom = lastGenerated
    ? addDays(lastGenerated, 1)
    : startDate

  // Cap at today
  const generateTo = endDate && isBefore(endDate, today) ? endDate : today

  if (isAfter(generateFrom, generateTo)) return []

  const dates: Date[] = []
  let cursor = findFirstOccurrence(rule, generateFrom)

  while (cursor && (isBefore(cursor, generateTo) || isEqual(cursor, generateTo))) {
    if (endDate && isAfter(cursor, endDate)) break
    dates.push(cursor)
    cursor = nextOccurrence(rule, cursor)
  }

  return dates.map(date => ({
    household_id: rule.household_id,
    paid_by: rule.paid_by,
    category_id: rule.category_id,
    amount: rule.amount,
    description: rule.description,
    transaction_date: format(date, 'yyyy-MM-dd'),
    is_income: rule.is_income,
    recurring_id: rule.id,
  }))
}

function findFirstOccurrence(rule: RecurringRule, from: Date): Date | null {
  // Walk forward from `from` until we hit a valid occurrence date
  let cursor = from
  for (let i = 0; i < 400; i++) {
    if (matchesRule(rule, cursor)) return cursor
    cursor = addDays(cursor, 1)
  }
  return null
}

function nextOccurrence(rule: RecurringRule, after: Date): Date | null {
  let cursor = addDays(after, 1)
  for (let i = 0; i < 400; i++) {
    if (matchesRule(rule, cursor)) return cursor
    cursor = addDays(cursor, 1)
  }
  return null
}

function matchesRule(rule: RecurringRule, date: Date): boolean {
  switch (rule.frequency) {
    case 'daily':
      return true
    case 'weekly':
      return rule.day_of_week === null || getDay(date) === rule.day_of_week
    case 'biweekly': {
      // Every 14 days from the rule's start_date
      const start = parseISO(rule.start_date)
      const diff = differenceInDays(date, start)
      return diff >= 0 && diff % 14 === 0
    }
    case 'monthly':
      return rule.day_of_month === null || getDate(date) === rule.day_of_month
    case 'yearly': {
      const month = date.getMonth() + 1
      const day = getDate(date)
      const matchesMonth = rule.month_of_year === null || month === rule.month_of_year
      const matchesDay = rule.day_of_month === null || day === rule.day_of_month
      return matchesMonth && matchesDay
    }
    default:
      return false
  }
}
