import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import type { StatusCounts } from "./model"

/**
 * The KPI row: three counts and the study's run date. Proportional figures on
 * the big numbers; no invented deadlines.
 */
export function NexusStatusChips({
  counts,
  runDate,
  unregisteredCount,
}: {
  counts: StatusCounts
  runDate: string | null
  unregisteredCount: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Chip
        label="Has nexus"
        value={counts.has_nexus}
        hint={
          unregisteredCount > 0
            ? `${unregisteredCount} without a registration yet`
            : "All registered"
        }
        dot="#0369a1"
      />
      <Chip label="Approaching" value={counts.approaching} hint="80% of threshold or more" dot="#d97706" />
      <Chip label="Below threshold" value={counts.safe} hint="No action needed" dot="#a1a1aa" />
      <Card size="sm" className="justify-center">
        <CardContent>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Study run</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{formatDate(runDate)}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">Recomputed nightly by Numeral</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Chip({ label, value, hint, dot }: { label: string; value: number; hint: string; dot: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
          <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
          {label}
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}
