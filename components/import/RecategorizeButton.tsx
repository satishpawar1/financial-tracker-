'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Tags } from 'lucide-react'
import { toast } from 'sonner'

export function RecategorizeButton() {
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch('/api/import/recategorize', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      if (json.updated === 0) {
        toast.info('No uncategorized transactions found')
      } else {
        toast.success(`Categorized ${json.updated} of ${json.total} uncategorized transactions`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tags className="h-4 w-4 mr-2" />}
      Auto-categorize existing
    </Button>
  )
}
