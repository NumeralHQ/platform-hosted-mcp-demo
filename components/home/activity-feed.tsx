import Link from "next/link"
import { RotateCcw, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMinorUsd } from "@/lib/format"
import { relativeTime, type ActivityItem } from "@/lib/home/aggregate"
import { cn } from "@/lib/utils"

/** The latest orders and refunds, newest first. */
export function ActivityFeed({ items, error }: { items: readonly ActivityItem[]; error?: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Orders and refunds across all channels.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/tax/sales" />} nativeButton={false}>
            All orders
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <p className="text-muted-foreground px-6 pb-6 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-6 pb-6 text-sm">No orders yet.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      item.kind === "refund" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {item.kind === "refund" ? <RotateCcw className="size-4" /> : <ShoppingBag className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {[item.place, relativeTime(item.processedAt)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {item.amount !== null && (
                    <span className={cn("text-sm font-medium tabular-nums", item.kind === "refund" && "text-amber-700")}>
                      {formatMinorUsd(item.amount)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
