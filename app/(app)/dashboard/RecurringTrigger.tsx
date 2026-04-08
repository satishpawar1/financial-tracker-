'use client'

import { useEffect } from 'react'

// Silently triggers recurring transaction generation on dashboard load
export function RecurringTrigger() {
  useEffect(() => {
    fetch('/api/recurring/generate', { method: 'POST' }).catch(() => {})
  }, [])

  return null
}
