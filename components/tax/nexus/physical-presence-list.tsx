import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import type { NexusStudy, ToolCallTrace } from "@/lib/numeral"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { humanizePresence } from "./model"

export function PhysicalPresenceList({
  presences,
  jurisdictionNames,
  trace,
}: {
  presences: NexusStudy["physical_presences"]
  jurisdictionNames: ReadonlyMap<string, string>
  trace: ToolCallTrace
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" /> Physical presence
          </CardTitle>
          <CardDescription>
            Where you have nexus regardless of sales: an office, inventory, people, or your incorporation state.
          </CardDescription>
        </div>
        <RecordedBadge trace={trace} />
      </CardHeader>
      <CardContent>
        {presences.length === 0 ? (
          <p className="text-muted-foreground text-sm">No physical presence on file.</p>
        ) : (
          <ul className="divide-y">
            {presences.map((presence, index) => (
              <li key={`${presence.jurisdiction_id}-${presence.rule}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {jurisdictionNames.get(presence.jurisdiction_id) ?? presence.jurisdiction_id}
                    <span className="text-muted-foreground ml-2 font-normal">{humanizePresence(presence.rule)}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Since {formatDate(presence.starts_on)}</p>
                </div>
                {presence.manual_entry && (
                  <Badge variant="outline" className="text-muted-foreground shrink-0 font-normal">
                    Entered by you
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
