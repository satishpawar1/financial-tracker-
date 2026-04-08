'use client'

import { useRef, useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
type FileSource = 'csv' | 'pdf' | 'excel'

interface UploadResult {
  imported: number
  skipped: number
}

interface Props {
  onSuccess?: (result: UploadResult, source: FileSource) => void
}

function detectSource(file: File): FileSource | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.ods')) return 'excel'
  return null
}

export function FileUpload({ onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    const source = detectSource(file)
    if (!source) {
      toast.error('Unsupported file type. Use CSV, PDF, or Excel.')
      return
    }

    setStatus('uploading')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/import/${source}`, {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setResult({ imported: json.imported, skipped: json.skipped })
      setStatus('success')
      toast.success(`Imported ${json.imported} transactions`)
      onSuccess?.({ imported: json.imported, skipped: json.skipped }, source)
    } catch (err) {
      setStatus('error')
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.pdf,.xlsx,.xls,.ods"
        className="hidden"
        onChange={handleInputChange}
      />

      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          status === 'uploading' && 'pointer-events-none opacity-70'
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
      >
        {status === 'uploading' ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Processing file...</p>
          </div>
        ) : status === 'success' && result ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-semibold">{result.imported} transactions imported</p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground">{result.skipped} rows skipped</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={e => { e.stopPropagation(); setStatus('idle'); setResult(null) }}
            >
              Upload another
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold">Drop your statement here</p>
              <p className="text-sm text-muted-foreground">Supports CSV, PDF, and Excel (.xlsx)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
            >
              Browse files
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
