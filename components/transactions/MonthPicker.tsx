'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface Props {
  currentFrom: string
}

export function MonthPicker({ currentFrom }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = new Date(currentFrom + 'T12:00:00')

  function navigate(date: Date) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', format(startOfMonth(date), 'yyyy-MM-dd'))
    params.set('to', format(endOfMonth(date), 'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(subMonths(current, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium w-28 text-center">
        {format(current, 'MMMM yyyy')}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(addMonths(current, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
