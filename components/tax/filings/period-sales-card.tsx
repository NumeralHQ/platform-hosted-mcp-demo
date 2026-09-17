import type { FilingDetail, SalesSummary, ToolCallTrace } from "@/lib/numeral"
import { formatCount, formatMinorUsd } from "@/lib/format"
import { BUCKET_ORDER, bucketLabel, bucketOf, type LiabilityBucket } from "@/lib/liability"
import type { PlatformSkin } from "@/platform.config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecordedBadge } from "@/components/tax/recorded-badge"

interface BucketTotals {
  bucket: LiabilityBucket
  /** Minor units. */
  totalSales: number
  /** Minor units. */
  taxCollected: number
  transactions: number
}

/**
 * Platform rows inside the filing's period and state, grouped by who remits.
 * The MCP returns monthly rows, so the period is matched on `month`; a
 * period that ends mid-month is compared at month granularity.
 */
export function aggregatePeriodSales(summary: SalesSummary, filing: FilingDetail): BucketTotals[] {
  const fromMonth = filing.period_starts_at?.slice(0, 7) ?? ""
  const toMonth = filing.period_ends_at?.slice(0, 7) ?? ""
  const totals = new Map<LiabilityBucket, BucketTotals>()
  for (const row of summary.rows) {
    if (row.month < fromMonth || row.month > toMonth) {
      continue
    }
    if (filing.state && row.state !== filing.state) {
      continue
    }
    const bucket = bucketOf(row.liability)
    const current = totals.get(bucket) ?? { bucket, totalSales: 0, taxCollected: 0, transactions: 0 }
    current.totalSales += row.total_sales
    current.taxCollected += row.tax_collected
    current.transactions += row.transaction_count
    totals.set(bucket, current)
  }
  const result: BucketTotals[] = []
  for (const bucket of BUCKET_ORDER) {
    const entry = totals.get(bucket)
    if (entry) {
      result.push(entry)
    }
  }
  return result
}

export function PeriodSalesCard({
  skin,
  filing,
  summary,
  trace,
}: {
  skin: PlatformSkin
  filing: FilingDetail
  summary: SalesSummary
  trace: ToolCallTrace
}) {
  const rows = aggregatePeriodSales(summary, filing)
  const stateLabel = filing.state ?? filing.jurisdiction_id
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{skin.name} sales in this period</CardTitle>
          <RecordedBadge trace={trace} />
        </div>
        <CardDescription>
          {stateLabel} sales recorded by {skin.name}, for reference; may not match the return.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No {skin.name} sales recorded in {stateLabel} for this period.
          </p>
        ) : (
          <dl className="space-y-3">
            {rows.map((row) => (
              <div key={row.bucket} className="space-y-0.5">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{bucketLabel(row.bucket, skin)}</dt>
                <dd className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="tabular-nums">{formatMinorUsd(row.totalSales)} sales</span>
                  <span className="text-muted-foreground tabular-nums">{formatMinorUsd(row.taxCollected)} tax</span>
                </dd>
                <dd className="text-muted-foreground text-xs tabular-nums">{formatCount(row.transactions)} transactions</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
