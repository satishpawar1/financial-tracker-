'use client'

import type { HouseholdMember } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface Props {
  members: HouseholdMember[]
  value: string
  onChange: (id: string) => void
}

export function PersonPicker({ members, value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {members.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            'flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors',
            value === m.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
          )}
        >
          {m.display_name}
        </button>
      ))}
    </div>
  )
}
