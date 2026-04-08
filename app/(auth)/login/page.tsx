'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [signupMode, setSignupMode] = useState<'new' | 'join'>('new')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const supabase = createClient()

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { toast.error(error.message); return }
        router.push('/dashboard')
        router.refresh()
        return
      }

      // Sign up — or sign in if already registered (handles partial signup retry)
      let userId: string
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

      if (authError?.message?.toLowerCase().includes('already registered')) {
        // User exists — sign in instead and continue setup
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError || !signInData.user) { toast.error(signInError?.message ?? 'Sign in failed'); return }
        userId = signInData.user.id
      } else if (authError || !authData.user) {
        toast.error(authError?.message ?? 'Signup failed')
        return
      } else {
        userId = authData.user.id
      }

      // Check if household already exists for this user (partial signup recovery)
      const { data: existingMember } = await supabase
        .from('household_members')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        // Already set up — just go to dashboard
        router.push('/dashboard')
        router.refresh()
        return
      }

      if (signupMode === 'new') {
        // Create household
        const { data: household, error: hErr } = await supabase
          .from('households')
          .insert({ name: householdName || 'My Household' })
          .select()
          .single()
        if (hErr || !household) { toast.error(hErr?.message ?? 'Failed to create household'); return }

        // Create member row
        const { error: mErr } = await supabase
          .from('household_members')
          .insert({ household_id: household.id, user_id: userId, display_name: displayName || email })
        if (mErr) { toast.error(mErr.message); return }

        // Seed categories via RPC
        await supabase.rpc('seed_default_categories', { p_household_id: household.id })

        toast.success('Household created!')
      } else {
        // Join via invite code
        const { data: invite, error: iErr } = await supabase
          .from('household_invites')
          .select('*')
          .eq('code', inviteCode.trim().toUpperCase())
          .is('used_by', null)
          .single()

        if (iErr || !invite) { toast.error('Invalid or already used invite code'); return }

        // Create member row
        const { error: mErr } = await supabase
          .from('household_members')
          .insert({ household_id: invite.household_id, user_id: userId, display_name: displayName || email })
        if (mErr) { toast.error('Failed to join household'); return }

        // Mark invite as used
        await supabase
          .from('household_invites')
          .update({ used_by: userId, used_at: new Date().toISOString() })
          .eq('id', invite.id)

        toast.success('Joined household!')
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Finances</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Your name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. John"
                    required
                  />
                </div>

                <div className="flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${signupMode === 'new' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setSignupMode('new')}
                  >
                    New household
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${signupMode === 'join' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setSignupMode('join')}
                  >
                    Join existing
                  </button>
                </div>

                {signupMode === 'new' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="householdName">Household name</Label>
                    <Input
                      id="householdName"
                      value={householdName}
                      onChange={e => setHouseholdName(e.target.value)}
                      placeholder="e.g. Smith Family"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="inviteCode">Invite code</Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      placeholder="e.g. ABC123"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button className="text-primary underline" onClick={() => setMode('signup')}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Have an account?{' '}
                <button className="text-primary underline" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
