import { getMonthlySummary, getCategoryBreakdown, getMonthlyTrends, getCategoryTrend } from '@/actions/transactions'
import { getCategories } from '@/actions/categories'
import { MonthlySummary } from '@/components/reports/MonthlySummary'
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown'
import { TrendChart } from '@/components/reports/TrendChart'
import { CategoryTrendChart } from '@/components/reports/CategoryTrendChart'
import { MonthPicker } from '@/components/transactions/MonthPicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentMonthRange } from '@/lib/utils/dates'
import { format } from 'date-fns'

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams
  const { from: defaultFrom, to: defaultTo } = currentMonthRange()
  const from = params.from ?? defaultFrom
  const to = params.to ?? defaultTo

  const selectedDate = new Date(from + 'T12:00:00')
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1

  const categories = await getCategories()
  // Exclude Salary category from the trend picker (it's income, not expense)
  const expenseCategories = categories.filter(c => c.name !== 'Salary')
  const defaultCategoryId = expenseCategories[0]?.id ?? ''

  const [summary, categoryData, trends, categoryTrend] = await Promise.all([
    getMonthlySummary(year, month),
    getCategoryBreakdown(from, to),
    getMonthlyTrends(6),
    defaultCategoryId ? getCategoryTrend(defaultCategoryId, 12) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Reports</h1>
        <MonthPicker currentFrom={from} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {format(selectedDate, 'MMMM yyyy')} Summary
        </h2>
        <MonthlySummary
          totalIncome={summary.totalIncome}
          totalExpenses={summary.totalExpenses}
          net={summary.net}
        />
      </div>

      {/* Per-person breakdown */}
      {Object.keys(summary.byPerson).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Person</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(summary.byPerson).map(p => (
                <div key={p.name} className="flex justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <div className="flex gap-4 text-muted-foreground">
                    <span className="text-emerald-600">+${p.income.toFixed(2)}</span>
                    <span>-${p.expenses.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown data={categoryData} />
        </CardContent>
      </Card>

      {/* Category trend — interactive, client-side category switching */}
      {expenseCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryTrendChart
              categories={expenseCategories}
              initialCategoryId={defaultCategoryId}
              initialData={categoryTrend}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">6-Month Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trends} />
        </CardContent>
      </Card>
    </div>
  )
}
