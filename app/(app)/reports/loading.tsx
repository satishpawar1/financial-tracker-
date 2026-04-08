import { Skeleton } from '@/components/ui/skeleton'

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-24" />

      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-52 w-full" />
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
