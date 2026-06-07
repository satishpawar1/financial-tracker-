import { getUtilitiesForBulkEdit } from '@/actions/transactions'
import { UtilityBulkEditor } from '@/components/utilities/UtilityBulkEditor'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function UtilitiesPage() {
  const groups = await getUtilitiesForBulkEdit()

  const totalTx = groups.reduce((s, g) => s + g.transactions.length, 0)
  const tagged = groups.reduce((s, g) => s + g.alreadyTagged, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Utility Types</h1>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No utility transactions found. Add a transaction under the Utilities category first.
        </p>
      ) : (
        <UtilityBulkEditor groups={groups} totalTx={totalTx} tagged={tagged} />
      )}
    </div>
  )
}
