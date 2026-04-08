'use client'

import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface Props {
  householdId: string | null
}

export function RealtimeProvider({ householdId }: Props) {
  useRealtimeSync(householdId)
  return null
}
