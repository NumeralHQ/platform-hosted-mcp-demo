import { Radar } from "lucide-react"
import type { NexusJurisdiction, Registration } from "@/lib/numeral"
import { formatPercent } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/** Nexus-study jurisdictions with a position but no registration row. */
export function unregisteredWatchlist(
  jurisdictions: readonly NexusJurisdiction[],
  registrations: readonly Registration[]
): NexusJurisdiction[] {
  const registered = new Set(registrations.map((registration) => registration.jurisdiction_id))
  return jurisdictions
    .filter((jurisdiction) => jurisdiction.status === "approaching" || jurisdiction.has_nexus)
    .filter((jurisdiction) => !registered.has(jurisdiction.jurisdiction_id))
    .sort((a, b) => {
      if (a.has_nexus !== b.has_nexus) {
        return a.has_nexus ? -1 : 1
      }
      return (b.economic?.threshold_percent ?? 0) - (a.economic?.threshold_percent ?? 0)
    })
}

/**
 * States the nexus study says are close to, or past, a threshold where no
 * registration exists yet. Numeral is watching them; this block says only
 * what the study says and invents no deadlines.
 */
export function RegisterHereHint({ watchlist }: { watchlist: readonly NexusJurisdiction[] }) {
  if (watchlist.length === 0) {
    return null
  }
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radar className="size-4" />
          <CardTitle className="text-base">Numeral is watching these</CardTitle>
        </div>
        <CardDescription>
          States where your sales are near or past a nexus threshold and you do not hold a registration yet.
          Numeral tracks them against each state&apos;s rule and will flag when a registration is needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {watchlist.map((jurisdiction) => (
            <li key={jurisdiction.jurisdiction_id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
              <span className="font-medium">{jurisdiction.jurisdiction_name}</span>
              <Badge
                variant="outline"
                className={
                  jurisdiction.has_nexus
                    ? "border-red-200 bg-red-50 font-normal text-red-800"
                    : "border-amber-200 bg-amber-50 font-normal text-amber-900"
                }
              >
                {jurisdiction.has_nexus ? "Has nexus" : "Approaching threshold"}
              </Badge>
              {jurisdiction.economic ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatPercent(jurisdiction.economic.threshold_percent)} of threshold
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
