import { getBudgetsWithSpend } from '@/actions/budgets'
import { getCategories } from '@/actions/categories'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { AddBudgetSheet } from '@/components/budgets/AddBudgetSheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { PiggyBank } from 'lucide-react'
import { monthLabel } from '@/lib/utils/dates'

export default async function BudgetsPage() {
  const [budgets, categories] = await Promise.all([
    getBudgetsWithSpend(),
    getCategories(),
  ])

  const budgetedCategoryIds = new Set(budgets.map(b => b.category_id))
  const availableCategories = categories.filter(c => !budgetedCategoryIds.has(c.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground">{monthLabel()}</p>
        </div>
        <AddBudgetSheet availableCategories={availableCategories} />
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets yet"
          description="Set monthly limits for each spending category and get notified when you're close."
        />
      ) : (
        <div className="space-y-3">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b as unknown as Parameters<typeof BudgetCard>[0]['budget']}
            />
          ))}
        </div>
      )}
    </div>
  )
}
