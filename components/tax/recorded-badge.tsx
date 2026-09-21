import { Badge } from "@/components/ui/badge"
import type { ToolCallTrace } from "@/lib/numeral"

/**
 * Shown on any panel whose data came from a recorded fixture instead of a
 * live Numeral call. Keeps the demo honest: a prospect can always tell which
 * numbers were fetched in front of them.
 */
export function RecordedBadge({ trace }: { trace: ToolCallTrace | ToolCallTrace[] }) {
  const traces = Array.isArray(trace) ? trace : [trace]
  const recorded = traces.filter((t) => t.source === "fixture")
  if (recorded.length === 0) {
    return null
  }
  const reason = recorded.find((t) => t.fallbackReason)?.fallbackReason
  return (
    <Badge variant="outline" className="text-muted-foreground font-normal" title={reason ? `Live call not possible here: ${reason}` : undefined}>
      Recorded data
    </Badge>
  )
}
