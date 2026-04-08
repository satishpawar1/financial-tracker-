'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Download } from 'lucide-react'
import { currentMonthRange } from '@/lib/utils/dates'

export default function ExportPage() {
  const { from: defaultFrom, to: defaultTo } = currentMonthRange()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  function handleExport() {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    window.location.href = `/api/export/csv?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Export</h1>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Exports all transactions in the selected date range as a CSV file. Includes date, description, amount, type, category, and who paid.
      </p>
    </div>
  )
}
