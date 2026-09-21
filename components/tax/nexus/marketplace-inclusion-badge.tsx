import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * THE differentiator on this page: whether the state counts marketplace
 * sales toward its economic-nexus threshold. "Counts" means the platform's
 * marketplace sales push the merchant toward nexus; "Excluded" means only
 * their own storefront sales do.
 */
export function MarketplaceInclusionBadge({
  counts,
  marketplaceChannel,
  className,
}: {
  counts: boolean | null
  marketplaceChannel: string
  className?: string
}) {
  if (counts === null) {
    return <span className={cn("text-muted-foreground text-xs", className)}>—</span>
  }
  return (
    <span
      title={
        counts
          ? `${marketplaceChannel} sales count toward this state's threshold.`
          : `${marketplaceChannel} sales are excluded from this state's threshold; only storefront sales count.`
      }
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-xs font-medium whitespace-nowrap",
        counts ? "border-border text-foreground" : "border-dashed text-muted-foreground",
        className
      )}
    >
      {counts ? <Check className="size-3" aria-hidden /> : <Minus className="size-3" aria-hidden />}
      {counts ? "Counts" : "Excluded"}
    </span>
  )
}
