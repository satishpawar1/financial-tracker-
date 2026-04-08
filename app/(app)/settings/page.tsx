import { createClient } from '@/lib/supabase/server'
import { getCategories } from '@/actions/categories'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: household } = await supabase
    .from('households')
    .select('*')
    .eq('id', await supabase.rpc('get_my_household_id').then(r => r.data as string))
    .single()

  const { data: members } = await supabase
    .from('household_members')
    .select('*')
    .order('created_at')

  const { data: invites } = await supabase
    .from('household_invites')
    .select('*')
    .is('used_by', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const categories = await getCategories()

  return (
    <SettingsClient
      household={household}
      members={members ?? []}
      currentUserId={user!.id}
      invites={invites ?? []}
      categories={categories}
    />
  )
}
