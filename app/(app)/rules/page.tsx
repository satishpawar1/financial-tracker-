import { getCategoryRules } from '@/actions/categoryRules'
import { getCategories } from '@/actions/categories'
import { RulesManager } from '@/components/rules/RulesManager'

export default async function RulesPage() {
  const [rules, categories] = await Promise.all([
    getCategoryRules(),
    getCategories(),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Category Rules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Map merchant descriptions to categories. These rules are used automatically on every import.
          After editing, click <strong>Re-apply rules</strong> to update existing transactions.
        </p>
      </div>

      <RulesManager rules={rules} categories={categories} />
    </div>
  )
}
