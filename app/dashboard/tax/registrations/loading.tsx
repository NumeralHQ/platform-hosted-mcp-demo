import { Skeleton } from "@/components/ui/skeleton"

export default function RegistrationsLoading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-7 w-28" />
      </div>
      {[4, 2].map((rows, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="rounded-xl border">
            <Skeleton className="h-10 w-full rounded-b-none" />
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex items-center gap-4 border-t px-4 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
