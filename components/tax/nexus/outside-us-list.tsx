import { Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ToolCallTrace } from "@/lib/numeral"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import type { JurisdictionRow } from "./model"
import { StatusBadge } from "./status-badge"

export function OutsideUsList({ rows, trace }: { rows: readonly JurisdictionRow[]; trace: ToolCallTrace }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4" /> Outside the US
          </CardTitle>
          <CardDescription>Countries where you have recorded sales. VAT and GST positions are tracked separately.</CardDescription>
        </div>
        <RecordedBadge trace={trace} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sales outside the US in this study.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.jurisdictionId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium">
                  {row.name} <span className="text-muted-foreground ml-1 font-mono text-xs">{row.jurisdictionId}</span>
                </span>
                <StatusBadge status={row.status} registered={row.registration.state === "registered"} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
