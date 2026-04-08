'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { HouseholdMember } from '@/types/database.types'

interface Props {
  members: HouseholdMember[]
}

export function TransactionFilterBar({ members }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function set(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  function toggle(key: string, value: string) {
    const current = searchParams.get(key)
    set(key, current === value ? null : value)
  }

  const activePerson = searchParams.get('person')
  const uncategorized = searchParams.get('uncategorized') === 'true'
  const hasFilters = activePerson || uncategorized

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={() => toggle('uncategorized', 'true')}
        className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
          uncategorized
            ? 'bg-orange-500 text-white border-orange-500'
            : 'border-border text-muted-foreground hover:border-foreground'
        }`}
      >
        Uncategorized
      </button>

      {members.map(m => (
        <button
          key={m.id}
          onClick={() => set('person', activePerson === m.id ? null : m.id)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
            activePerson === m.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-foreground'
          }`}
        >
          {m.display_name}
        </button>
      ))}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-muted-foreground"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString())
            params.delete('person')
            params.delete('uncategorized')
            router.push(`${pathname}?${params.toString()}`)
          }}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
