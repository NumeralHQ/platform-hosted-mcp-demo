import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatPercentReal } from "./model"

/**
 * A single ratio against a limit: one track, one fill, in the row's own
 * status hue. The bar caps at 100 so a 260% state fills the track; the label
 * prints the real percent.
 */
export function ThresholdMeter({
  percent,
  tone = "neutral",
  className,
  compact = false,
}: {
  percent: number | null
  tone?: "accent" | "warning" | "approaching" | "neutral"
  className?: string
  compact?: boolean
}) {
  if (percent === null) {
    return <span className={cn("text-muted-foreground text-xs", className)}>—</span>
  }
  const capped = Math.max(0, Math.min(100, percent))
  const fill =
    tone === "accent"
      ? "bg-sky-700"
      : tone === "warning"
        ? "bg-red-700"
        : tone === "approaching"
          ? "bg-amber-600"
          : "bg-foreground/40"
  return (
    <Progress
      value={capped}
      aria-valuetext={`${formatPercentReal(percent)} of threshold`}
      className={cn("flex-nowrap items-center gap-2", compact ? "w-28" : "w-40", className)}
    >
      <span className={cn("order-2 shrink-0 text-xs tabular-nums", percent >= 100 ? "font-medium" : "text-muted-foreground")}>
        {formatPercentReal(percent)}
      </span>
      <ProgressTrack className="order-1 h-1.5">
        <ProgressIndicator className={cn("rounded-full", fill)} />
      </ProgressTrack>
      {percent > 100 && (
        <span className="sr-only">Over the threshold</span>
      )}
    </Progress>
  )
}

export function toneFor(status: "has_nexus" | "approaching" | "safe", registered: boolean): "accent" | "warning" | "approaching" | "neutral" {
  if (status === "has_nexus") {
    return registered ? "accent" : "warning"
  }
  return status === "approaching" ? "approaching" : "neutral"
}
