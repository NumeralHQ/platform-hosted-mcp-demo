import Link from "next/link"
import type { FilingSummary } from "@/lib/numeral"
import { formatPeriod } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { FILING_BUCKET_LABELS, FILING_BUCKET_ORDER } from "./filing-status"
import { countByBucket, dueLabel, nextDue } from "./grouping"

/** Counts per bucket plus the single most urgent return. */
export function FilingsHeader({ filings }: { filings: readonly FilingSummary[] }) {
  const counts = countByBucket(filings)
  const next = nextDue(filings)
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {FILING_BUCKET_ORDER.map((bucket) => (
        <Card key={bucket} size="sm">
          <CardContent>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{FILING_BUCKET_LABELS[bucket]}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{counts[bucket]}</p>
          </CardContent>
        </Card>
      ))}
      <Card size="sm" className="border-l-4 border-l-red-600">
        <CardContent>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Next due</p>
          {next ? (
            <p className="mt-1 text-sm leading-snug">
              <Link href={`/dashboard/tax/filings/${next.filing.id}`} className="font-semibold hover:underline">
                {next.filing.state ?? next.filing.jurisdiction_id}{" "}
                {formatPeriod(next.filing.period_starts_at, next.filing.period_ends_at)}
              </Link>
              {next.daysUntil !== null ? (
                <span className={next.daysUntil < 0 ? "block text-red-700" : "text-muted-foreground block"}>
                  {dueLabel(next.daysUntil)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">Nothing outstanding</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
