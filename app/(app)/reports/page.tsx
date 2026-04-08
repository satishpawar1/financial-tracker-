import { getMonthlySummary, getCategoryBreakdown, getMonthlyTrends } from '@/actions/transactions'
import { MonthlySummary } from '@/components/reports/MonthlySummary'
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown'
import { TrendChart } from '@/components/reports/TrendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentMonthRange, monthLabel } from '@/lib/utils/dates'

export default async function ReportsPage() {
  const now = new Date()
  const { from, to } = currentMonthRange()

  const [summary, categoryData, trends] = await Promise.all([
    getMonthlySummary(now.getFullYear(), now.getMonth() + 1),
    getCategoryBreakdown(from, to),
    getMonthlyTrends(6),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Reports</h1>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {monthLabel()} Summary
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">6-Month Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trends} />
        </CardContent>
      </Card>
    </div>
  )
}
