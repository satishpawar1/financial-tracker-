'use client'

import { useState, useTransition } from 'react'
import { Loader2, Tags, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateCategoryRule, deleteCategoryRule } from '@/actions/categoryRules'
import type { Category } from '@/types/database.types'
import type { CategoryRule } from '@/actions/categoryRules'

interface Props {
  rules: CategoryRule[]
  categories: Category[]
}

export function RulesManager({ rules: initialRules, categories }: Props) {
  const [rules, setRules] = useState(initialRules)
  const [search, setSearch] = useState('')
  const [reapplying, setReapplying] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = rules.filter(r =>
    r.description.toLowerCase().includes(search.toLowerCase())
  )

  const uncategorizedCount = rules.filter(r => !r.category_id).length

  function handleCategoryChange(rule: CategoryRule, categoryId: string) {
    const value = categoryId === '__none__' ? null : categoryId
    // Optimistic update
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, category_id: value } : r))
    startTransition(async () => {
      await updateCategoryRule(rule.id, value)
    })
  }

  function handleDelete(rule: CategoryRule) {
    setRules(prev => prev.filter(r => r.id !== rule.id))
    startTransition(async () => {
      await deleteCategoryRule(rule.id)
    })
  }

  async function handleReapply() {
    setReapplying(true)
    try {
      const res = await fetch('/api/import/recategorize', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      if (json.updated === 0) {
        toast.info('No uncategorized transactions to update')
      } else {
        toast.success(
          `Updated ${json.updated} transactions` +
          (json.still_uncategorized > 0 ? ` · ${json.still_uncategorized} still uncategorized` : ' · All categorized!')
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setReapplying(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search descriptions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={handleReapply} disabled={reapplying} size="sm">
          {reapplying
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <RefreshCw className="h-4 w-4 mr-2" />}
          Re-apply rules
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{rules.length} rules total</span>
        {uncategorizedCount > 0 && (
          <span className="text-orange-500 font-medium">{uncategorizedCount} without a category</span>
        )}
      </div>

      {/* Rules list */}
      <div className="divide-y border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Tags className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No rules found
          </div>
        ) : (
          filtered.map(rule => {
            const cat = categories.find(c => c.id === rule.category_id)
            return (
              <div key={rule.id} className="flex items-center gap-3 px-4 py-2.5 bg-background hover:bg-muted/30">
                {/* Color dot */}
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat?.color ?? '#e2e8f0' }}
                />

                {/* Description */}
                <span className="flex-1 text-sm truncate" title={rule.description}>
                  {rule.description}
                </span>

                {/* Category selector */}
                <select
                  value={rule.category_id ?? '__none__'}
                  onChange={e => handleCategoryChange(rule, e.target.value)}
                  disabled={pending}
                  className="text-sm border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-36"
                >
                  <option value="__none__">— Uncategorized —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(rule)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Remove rule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
