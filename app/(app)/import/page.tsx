import { createClient } from '@/lib/supabase/server'
import { FileUpload } from '@/components/import/FileUpload'
import { RecategorizeButton } from '@/components/import/RecategorizeButton'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/dates'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: householdData } = await supabase.rpc('get_my_household_id')

  const { data: batches } = await supabase
    .from('import_batches')
    .select('*')
    .eq('household_id', householdData as string)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Import</h1>
        <RecategorizeButton />
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Upload a bank statement to automatically import transactions. Supported formats: CSV, PDF, Excel (.xlsx).
        </p>
        <p className="text-xs text-muted-foreground bg-muted rounded-md p-3">
          For best results with Excel, name your columns: <strong>Date</strong>, <strong>Amount</strong>, <strong>Description</strong>. For separate debit/credit columns use <strong>Debit</strong> and <strong>Credit</strong>.
        </p>
      </div>

      <FileUpload />

      {batches && batches.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Import History
          </h2>
          <div className="space-y-2">
            {batches.map(b => (
              <Card key={b.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{b.filename ?? 'Unnamed file'}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.source.toUpperCase()} · {formatDate(b.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{b.row_count} imported</p>
                    {b.skipped > 0 && (
                      <p className="text-xs text-muted-foreground">{b.skipped} skipped</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
