import { createClient } from '@/lib/supabase/server'
import { getRecurringRules } from '@/actions/recurring'
import { getCategories } from '@/actions/categories'
import { RecurringList } from '@/components/recurring/RecurringList'
import { AddRecurringSheet } from '@/components/recurring/AddRecurringSheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { RefreshCw } from 'lucide-react'

export default async function RecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('household_members')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: allMembers } = await supabase
    .from('household_members')
    .select('*')
    .order('created_at')

  const [rules, categories] = await Promise.all([
    getRecurringRules(),
    getCategories(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recurring</h1>
        <AddRecurringSheet
          members={allMembers ?? []}
          categories={categories}
          defaultMemberId={member?.id ?? ''}
        />
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring rules"
          description="Set up recurring transactions for fixed expenses like rent or regular income like salary."
        />
      ) : (
        <RecurringList
          rules={rules as unknown as Parameters<typeof RecurringList>[0]['rules']}
          members={allMembers ?? []}
          categories={categories}
          defaultMemberId={member?.id ?? ''}
        />
      )}
    </div>
  )
}
