'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Zap, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { bulkUpdateUtilityFields } from '@/actions/transactions'
import { UTILITY_TYPES } from '@/lib/utils/utility-types'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import type { UtilityBulkGroup } from '@/actions/transactions'

interface FieldEdit { type: string; provider: string }

interface Props {
  groups: UtilityBulkGroup[]
  totalTx: number
  tagged: number
}

export function UtilityBulkEditor({ groups, totalTx, tagged }: Props) {
  const [isPending, startTransition] = useTransition()

  // Group-level edits: applied to all transactions in the group unless individually overridden
  const [groupEdits, setGroupEdits] = useState<Record<string, FieldEdit>>(() => {
    const init: Record<string, FieldEdit> = {}
    for (const g of groups) {
      // Seed from majority value if most transactions already have a type, else from suggestion
      const firstTagged = g.transactions.find(t => t.utility_type)
      init[g.key] = {
        type: firstTagged?.utility_type ?? g.suggestedType ?? '',
        provider: firstTagged?.utility_provider ?? g.suggestedProvider ?? '',
      }
    }
    return init
  })

  // Individual transaction overrides (only transactions explicitly edited)
  const [txOverrides, setTxOverrides] = useState<Record<string, FieldEdit>>(() => {
    const init: Record<string, FieldEdit> = {}
    for (const g of groups) {
      for (const t of g.transactions) {
        if (t.utility_type || t.utility_provider) {
          init[t.id] = {
            type: t.utility_type ?? '',
            provider: t.utility_provider ?? '',
          }
        }
      }
    }
    return init
  })

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleGroup(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function setGroupField(key: string, field: 'type' | 'provider', value: string) {
    setGroupEdits(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function setTxField(id: string, groupKey: string, field: 'type' | 'provider', value: string) {
    const inherited = groupEdits[groupKey] ?? { type: '', provider: '' }
    const current = txOverrides[id] ?? inherited
    setTxOverrides(prev => ({ ...prev, [id]: { ...current, [field]: value } }))
  }

  function clearOverride(id: string) {
    setTxOverrides(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleSave() {
    startTransition(async () => {
      const updates = groups.flatMap(g =>
        g.transactions.map(t => {
          const override = txOverrides[t.id]
          const group = groupEdits[g.key] ?? { type: '', provider: '' }
          return {
            id: t.id,
            utility_type: (override?.type ?? group.type) || null,
            utility_provider: (override?.provider ?? group.provider) || null,
          }
        }),
      )
      try {
        await bulkUpdateUtilityFields(updates)
        toast.success(`Updated ${updates.length} transactions`)
      } catch {
        toast.error('Failed to save — please try again')
      }
    })
  }

  const untagged = totalTx - tagged

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground space-x-3">
          <span>{totalTx} transactions</span>
          <span className="text-emerald-600 font-medium">{tagged} tagged</span>
          {untagged > 0 && <span className="text-amber-600 font-medium">{untagged} need a type</span>}
        </div>
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? 'Saving…' : 'Save All'}
        </Button>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden sm:grid grid-cols-[1fr_160px_180px] gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Group / Description</span>
        <span>Utility Type</span>
        <span>Provider</span>
      </div>

      {groups.map(group => {
        const isOpen = expanded.has(group.key)
        const gEdit = groupEdits[group.key] ?? { type: '', provider: '' }
        const untaggedInGroup = group.transactions.filter(t => !txOverrides[t.id]?.type && !gEdit.type).length

        return (
          <Card key={group.key} className="overflow-hidden">
            {/* Group header row */}
            <div className="flex items-start gap-3 p-4">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{group.key}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.transactions.length} tx · {formatCurrency(group.totalAmount)}
                  </span>
                  {untaggedInGroup === 0 && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                  {untaggedInGroup > 0 && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-100 rounded px-1.5 py-0.5 dark:bg-amber-950 dark:text-amber-400">
                      {untaggedInGroup} untyped
                    </span>
                  )}
                </div>

                {/* Type + Provider fields — stacked on mobile, inline on desktop */}
                <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="sm:w-40">
                    <Select
                      value={gEdit.type}
                      onValueChange={v => setGroupField(group.key, 'type', v ?? '')}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select type…">
                          {gEdit.type ? (
                            <span className="flex items-center gap-1.5">
                              <Zap className="h-3 w-3" />{gEdit.type}
                            </span>
                          ) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {UTILITY_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="h-8 text-sm sm:w-44"
                    value={gEdit.provider}
                    onChange={e => setGroupField(group.key, 'provider', e.target.value)}
                    placeholder="Provider (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Individual transactions — shown when expanded */}
            {isOpen && (
              <CardContent className="pt-0 pb-3 px-4 border-t space-y-2">
                <p className="text-xs text-muted-foreground pt-2 pb-1">
                  Individual overrides — leave blank to inherit group settings above
                </p>
                {group.transactions.map(tx => {
                  const override = txOverrides[tx.id]
                  const hasOverride = Boolean(override)
                  const displayType = override?.type ?? gEdit.type
                  const displayProvider = override?.provider ?? gEdit.provider

                  return (
                    <div key={tx.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{tx.transaction_date}</span>
                          <span className="font-medium text-foreground">{formatCurrency(tx.amount)}</span>
                          <span className="truncate">{tx.description}</span>
                          {tx.notes && <span className="truncate text-muted-foreground/70">· {tx.notes}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-col sm:flex-row gap-1.5">
                          <Select
                            value={displayType}
                            onValueChange={v => setTxField(tx.id, group.key, 'type', v ?? '')}
                          >
                            <SelectTrigger className="h-7 text-xs sm:w-36">
                              <SelectValue placeholder={gEdit.type || 'Type…'} />
                            </SelectTrigger>
                            <SelectContent>
                              {UTILITY_TYPES.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            className="h-7 text-xs sm:w-40"
                            value={displayProvider}
                            onChange={e => setTxField(tx.id, group.key, 'provider', e.target.value)}
                            placeholder={gEdit.provider || 'Provider…'}
                          />
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => clearOverride(tx.id)}
                              className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            )}
          </Card>
        )
      })}

      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : `Save All ${totalTx} Transactions`}
        </Button>
      </div>
    </div>
  )
}
