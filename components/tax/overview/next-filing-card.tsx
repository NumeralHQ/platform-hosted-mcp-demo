import { CalendarClock } from "lucide-react"
import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { daysUntil, formatDate, formatPeriod, formatUsd, humanize } from "@/lib/format"
import type { ListFilings, Panel } from "@/lib/numeral"
import { AWAITING_APPROVAL_STATUS, filingOutlook } from "./aggregate"
import { TabLink } from "./tab-link"

/** The soonest return that still needs something, and how many wait on the merchant. */
export function NextFilingCard({ filings }: { filings: Panel<ListFilings> }) {
  if (!filings.ok) {
    return <PanelError title="Could not load your filings" message={filings.error.message} code={filings.code} />
  }

  const outlook = filingOutlook(filings.data.filings)
  const next = outlook.next
  const days = daysUntil(next?.due_on)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Next filing</CardTitle>
            <CardDescription>
              {outlook.openCount === 0
                ? "Nothing open"
                : `${outlook.openCount} open ${outlook.openCount === 1 ? "return" : "returns"}`}
            </CardDescription>
          </div>
          <RecordedBadge trace={filings.trace} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {next ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-semibold tracking-tight">{next.state ?? next.jurisdiction_id}</span>
              <span className="text-muted-foreground text-sm">{formatPeriod(next.period_starts_at, next.period_ends_at)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={next.status === AWAITING_APPROVAL_STATUS ? "default" : "secondary"}>
                {humanize(next.status)}
              </Badge>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <CalendarClock className="text-muted-foreground size-3.5" />
                Due {formatDate(next.due_on)}
                {days !== null ? (
                  <span className={days < 0 ? "text-red-700" : days <= 7 ? "text-amber-700" : "text-muted-foreground"}>
                    {" · "}
                    {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "due today" : `in ${days} ${days === 1 ? "day" : "days"}`}
                  </span>
                ) : null}
              </span>
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              Tax on this return {formatUsd(next.tax_collected)}
              {next.penalty_amount > 0 ? ` · penalty ${formatUsd(next.penalty_amount)}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No returns are waiting to be filed.</p>
        )}

        <p className="text-sm">
          {outlook.awaitingApproval === 0 ? (
            <span className="text-muted-foreground">Nothing is waiting for your approval.</span>
          ) : (
            <>
              <strong className="tabular-nums">{outlook.awaitingApproval}</strong>{" "}
              {outlook.awaitingApproval === 1 ? "return is" : "returns are"} waiting for your approval.
            </>
          )}
        </p>
      </CardContent>
      <CardFooter>
        <TabLink href="/dashboard/tax/filings">All filings</TabLink>
      </CardFooter>
    </Card>
  )
}
