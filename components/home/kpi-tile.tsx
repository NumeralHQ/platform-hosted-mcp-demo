import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatDelta } from "@/lib/home/aggregate"
import { cn } from "@/lib/utils"

/** A headline number with an optional month-over-month change. */
export function KpiTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: string
  /** Fractional change; omitted or null hides the badge. */
  delta?: number | null
  hint: string
}) {
  const deltaText = formatDelta(delta ?? null)
  const up = (delta ?? 0) >= 0
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          {deltaText && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {deltaText}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}
