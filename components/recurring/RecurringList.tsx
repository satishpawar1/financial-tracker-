'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RecurringForm } from './RecurringForm'
import { toggleRecurringRule, deleteRecurringRule } from '@/actions/recurring'
import { formatCurrency } from '@/lib/utils/currency'
import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { RecurringRule, Category, HouseholdMember } from '@/types/database.types'
import { cn } from '@/lib/utils'

type RuleWithRelations = RecurringRule & {
  categories?: Pick<Category, 'name' | 'color'> | null
  household_members?: Pick<HouseholdMember, 'display_name'> | null
}

interface Props {
  rules: RuleWithRelations[]
  members: HouseholdMember[]
  categories: Category[]
  defaultMemberId: string
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export function RecurringList({ rules, members, categories, defaultMemberId }: Props) {
  const [editing, setEditing] = useState<RuleWithRelations | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(rule: RuleWithRelations) {
    startTransition(async () => {
      try {
        await toggleRecurringRule(rule.id, !rule.is_active)
      } catch {
        toast.error('Failed to update')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this recurring rule? Existing transactions will not be removed.')) return
    startTransition(async () => {
      try {
        await deleteRecurringRule(id)
        toast.success('Deleted')
      } catch {
        toast.error('Failed to delete')
      }
    })
  }

  return (
    <>
      <div className="space-y-3">
        {rules.map(rule => (
          <Card key={rule.id} className={cn(!rule.is_active && 'opacity-60')}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ backgroundColor: rule.categories?.color ?? '#6366f1' }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{rule.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {FREQ_LABELS[rule.frequency]} · {rule.household_members?.display_name ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-sm font-semibold', rule.is_income ? 'text-emerald-600' : '')}>
                    {rule.is_income ? '+' : '-'}{formatCurrency(Number(rule.amount))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5">
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Paused'}
                  </Badge>
                  {rule.categories && (
                    <Badge variant="outline">{rule.categories.name}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(rule)}>
                    {rule.is_active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(rule)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!editing} onOpenChange={(open: boolean) => !open && setEditing(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Recurring Rule</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {editing && (
              <RecurringForm
                members={members}
                categories={categories}
                defaultMemberId={defaultMemberId}
                rule={editing}
                onSuccess={() => setEditing(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
