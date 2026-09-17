import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { FilingSummary } from "@/lib/numeral"
import { daysUntil, formatDate, formatPeriod, formatUsd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilingStatusBadge } from "./filing-status-badge"
import { FILING_BUCKET_DESCRIPTIONS, FILING_BUCKET_LABELS, filingBucket } from "./filing-status"
import { dueLabel, groupFilings } from "./grouping"

/** Returns grouped by bucket; soonest due first, most recent filed first. */
export function FilingsTimeline({ filings }: { filings: readonly FilingSummary[] }) {
  const groups = groupFilings(filings)
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No returns match these filters.
      </p>
    )
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.bucket} aria-labelledby={`filings-${group.bucket}`}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 id={`filings-${group.bucket}`} className="text-sm font-medium">
              {FILING_BUCKET_LABELS[group.bucket]}
            </h3>
            <span className="text-muted-foreground text-xs tabular-nums">{group.filings.length}</span>
            <span className="text-muted-foreground hidden text-xs sm:inline">· {FILING_BUCKET_DESCRIPTIONS[group.bucket]}</span>
          </div>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">State</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead className="text-right">Taxable sales</TableHead>
                  <TableHead className="text-right">Tax collected</TableHead>
                  <TableHead className="text-right">Penalty</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.filings.map((filing) => (
                  <FilingRow key={filing.id} filing={filing} />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  )
}

function FilingRow({ filing }: { filing: FilingSummary }) {
  const bucket = filingBucket(filing.status)
  const showCountdown = bucket !== "filed" && bucket !== "canceled"
  const days = showCountdown ? daysUntil(filing.due_on) : null
  const href = `/dashboard/tax/filings/${filing.id}`
  return (
    <TableRow>
      <TableCell className="pl-4 font-medium">{filing.state ?? filing.jurisdiction_id}</TableCell>
      <TableCell>
        <Link href={href} className="hover:underline">
          {formatPeriod(filing.period_starts_at, filing.period_ends_at)}
        </Link>
      </TableCell>
      <TableCell>
        <FilingStatusBadge status={filing.status} />
      </TableCell>
      <TableCell className="tabular-nums">
        {formatDate(filing.due_on)}
        {days !== null ? (
          <span className={cn("ml-1.5 text-xs", days < 0 ? "text-red-700" : "text-muted-foreground")}>{dueLabel(days)}</span>
        ) : null}
      </TableCell>
      <TableCell className="tabular-nums">{formatDate(filing.filed_at)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatUsd(filing.taxable_sales)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatUsd(filing.tax_collected)}</TableCell>
      <TableCell className={cn("text-right tabular-nums", filing.penalty_amount > 0 ? "font-medium text-red-700" : "text-muted-foreground")}>
        {filing.penalty_amount > 0 ? formatUsd(filing.penalty_amount) : "—"}
      </TableCell>
      <TableCell className="pr-4 text-right">
        <Link href={href} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
          View <ArrowRight className="size-3" aria-hidden />
        </Link>
      </TableCell>
    </TableRow>
  )
}
