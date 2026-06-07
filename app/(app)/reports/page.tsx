import { getCategoryBreakdown, getMonthlyTrends, getCategoryTrend, getAnnualSummary, getUtilityBreakdown } from '@/actions/transactions'
import { getCategories } from '@/actions/categories'
import { AnnualSummary } from '@/components/reports/AnnualSummary'
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown'
import { TrendChart } from '@/components/reports/TrendChart'
import { CategoryTrendChart } from '@/components/reports/CategoryTrendChart'
import { UtilityBreakdown } from '@/components/reports/UtilityBreakdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const now = new Date()
  const year = now.getFullYear()
  const from = `${year}-01-01`
  const to = now.toISOString().split('T')[0]

  const categories = await getCategories()
  // Exclude Salary category from the trend picker (it's income, not expense)
  const expenseCategories = categories.filter(c => c.name !== 'Salary')
  const defaultCategoryId = expenseCategories[0]?.id ?? ''

  const [annualData, categoryData, trends, categoryTrend, utilityBreakdown] = await Promise.all([
    getAnnualSummary(year),
    getCategoryBreakdown(from, to),
    getMonthlyTrends(6),
    defaultCategoryId ? getCategoryTrend(defaultCategoryId, 12) : Promise.resolve([]),
    getUtilityBreakdown(6),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Reports</h1>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {annualData.isCurrentYear ? `${year} Year to Date` : `${year} Annual`}
        </h2>
        <AnnualSummary {...annualData} />
      </div>

      {/* Per-person breakdown — YTD */}
      {Object.keys(annualData.byPerson).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              By Person — {annualData.isCurrentYear ? `${year} YTD` : `${year} Annual`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(annualData.byPerson).map(p => (
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

      {utilityBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Utility Provider Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <UtilityBreakdown data={utilityBreakdown} />
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
