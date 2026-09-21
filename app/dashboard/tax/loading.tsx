import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton for the overview: status strip, split hero, three cards, feed. */
export default function TaxOverviewLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading tax overview">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-28" />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-5 w-full max-w-3xl" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-32" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <CardHeader className="gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-7 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
