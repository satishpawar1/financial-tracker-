'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { deleteCategory } from '@/actions/categories'
import type { Household, HouseholdMember, Category } from '@/types/database.types'
import { toast } from 'sonner'
import { Trash2, Copy, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Invite {
  id: string
  code: string
  created_at: string
}

interface Props {
  household: Household | null
  members: HouseholdMember[]
  currentUserId: string
  invites: Invite[]
  categories: Category[]
}

export function SettingsClient({ household, members, currentUserId, invites: initialInvites, categories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [displayName, setDisplayName] = useState(
    members.find(m => m.user_id === currentUserId)?.display_name ?? ''
  )
  const [invites, setInvites] = useState(initialInvites)

  async function handleUpdateName() {
    const supabase = createClient()
    const { error } = await supabase
      .from('household_members')
      .update({ display_name: displayName.trim() })
      .eq('user_id', currentUserId)
    if (error) { toast.error(error.message); return }
    toast.success('Name updated')
    router.refresh()
  }

  async function handleCreateInvite() {
    const supabase = createClient()
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { data, error } = await supabase
      .from('household_invites')
      .insert({ household_id: household!.id, code })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setInvites(prev => [data, ...prev])
    toast.success('Invite code created')
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Delete this category? Transactions in this category will become uncategorized.')) return
    startTransition(async () => {
      try {
        await deleteCategory(id)
        toast.success('Category deleted')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Household */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{household?.name}</p>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Members</p>
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                  {m.display_name.charAt(0)}
                </div>
                <span className="text-sm">{m.display_name}</span>
                {m.user_id === currentUserId && <Badge variant="outline" className="text-xs">You</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite codes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Invite Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Share an invite code with your partner so they can join your household when signing up.</p>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted px-3 py-1.5 rounded font-mono tracking-widest">
                {inv.code}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { navigator.clipboard.writeText(inv.code); toast.success('Copied!') }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={handleCreateInvite}>
            <Plus className="h-4 w-4" />
            Generate invite code
          </Button>
        </CardContent>
      </Card>

      {/* Your name */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleUpdateName} disabled={!displayName.trim()}>
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Custom Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.filter(c => !c.is_system).length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom categories yet. Create one when adding a transaction.</p>
          ) : (
            <div className="space-y-2">
              {categories.filter(c => !c.is_system).map(cat => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  )
}
