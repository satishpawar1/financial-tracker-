'use client'

import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function AmountInput({ value, onChange, placeholder = '0.00', className, id }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    // Only allow digits and a single decimal point
    const sanitized = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    onChange(sanitized)
  }

  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        $
      </span>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-7"
      />
    </div>
  )
}
