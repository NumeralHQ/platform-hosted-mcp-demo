import { cn } from "@/lib/utils"
import { STATUS_LABELS, type MapStatus } from "./model"

/**
 * Status as a dot + word, never color alone. Has-nexus splits by whether a
 * registration exists, because that is the only case that needs attention.
 */
export function StatusBadge({
  status,
  registered,
  className,
}: {
  status: MapStatus
  registered: boolean
  className?: string
}) {
  const tone =
    status === "has_nexus"
      ? registered
        ? "bg-sky-50 text-sky-900 ring-sky-700/20 [--dot:#0369a1]"
        : "bg-red-50 text-red-900 ring-red-700/20 [--dot:#b91c1c]"
      : status === "approaching"
        ? "bg-amber-50 text-amber-900 ring-amber-700/20 [--dot:#d97706]"
        : "bg-muted text-muted-foreground ring-foreground/10 [--dot:#a1a1aa]"
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1",
        tone,
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: "var(--dot)" }} />
      {STATUS_LABELS[status]}
    </span>
  )
}
