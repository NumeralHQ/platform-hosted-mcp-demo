import Link from "next/link"
import { CalendarClock, CheckCircle2, MapPin, TrendingUp } from "lucide-react"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import type { ToolCallTrace } from "@/lib/numeral"
import type { ChangeEvent, ChangeKind } from "./aggregate"

const ICONS: Record<ChangeKind, typeof CalendarClock> = {
  due: CalendarClock,
  approaching: TrendingUp,
  filed: CheckCircle2,
  crossed: MapPin,
}

const TONES: Record<ChangeKind, string> = {
  due: "bg-amber-50 text-amber-800",
  approaching: "bg-amber-50 text-amber-800",
  filed: "bg-emerald-50 text-emerald-800",
  crossed: "bg-sky-50 text-sky-800",
}

/**
 * A short feed derived from the same responses the cards above used. Each
 * line names the field it came from so nothing here is editorial.
 */
export function WhatChangedFeed({ events, traces }: { events: readonly ChangeEvent[]; traces: readonly ToolCallTrace[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>What changed</CardTitle>
            <CardDescription>Derived from your nexus study and filings. Newest first.</CardDescription>
          </div>
          <RecordedBadge trace={[...traces]} />
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing to report yet.</p>
        ) : (
          <ol className="divide-y">
            {events.map((event) => {
              const Icon = ICONS[event.kind]
              return (
                <li key={`${event.kind}-${event.date}-${event.title}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ${TONES[event.kind]}`}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <Link href={event.href} className="text-sm font-medium hover:underline">
                        {event.title}
                      </Link>
                      <time dateTime={event.date} className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(event.date)}
                      </time>
                    </div>
                    <p className="text-muted-foreground text-sm">{event.detail}</p>
                    <p className="text-muted-foreground/70 font-mono text-[11px]">{event.source}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
