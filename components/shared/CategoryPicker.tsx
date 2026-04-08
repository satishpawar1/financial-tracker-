'use client'

import { useState, useTransition } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, Plus, Check } from 'lucide-react'
import type { Category } from '@/types/database.types'
import { createCategory } from '@/actions/categories'
import { cn } from '@/lib/utils'

interface Props {
  categories: Category[]
  value?: string | null
  onChange: (id: string | null) => void
}

export function CategoryPicker({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [, startTransition] = useTransition()

  const selected = categories.find(c => c.id === value)
  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const cat = await createCategory({
        name: newName.trim(),
        color: '#6366f1',
        icon: 'tag',
      })
      onChange(cat.id)
      setOpen(false)
      setNewName('')
      setSearch('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full justify-between font-normal">
            {selected ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: selected.color }}
                />
                {selected.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Select category</span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        }
      />
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          <button
            type="button"
            className={cn(
              'w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2',
              !value ? 'bg-accent' : 'hover:bg-accent'
            )}
            onClick={() => { onChange(null); setOpen(false) }}
          >
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30 shrink-0" />
            No category
            {!value && <Check className="h-3 w-3 ml-auto" />}
          </button>
          {filtered.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2',
                value === cat.id ? 'bg-accent' : 'hover:bg-accent'
              )}
              onClick={() => { onChange(cat.id); setOpen(false); setSearch('') }}
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
              {value === cat.id && <Check className="h-3 w-3 ml-auto" />}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t flex gap-1.5">
          <Input
            placeholder="New category..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="h-8 text-sm flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
