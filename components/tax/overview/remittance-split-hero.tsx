import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCount, formatMinorUsd, formatMonth } from "@/lib/format"
import { BUCKET_COLORS, bucketExplanation, bucketLabel, type LiabilityBucket } from "@/lib/liability"
import type { DateRange, Panel, SalesSummary } from "@/lib/numeral"
import type { PlatformSkin } from "@/platform.config"
import { splitRemittance, type BucketTotals } from "./aggregate"
import { BucketInfo } from "./bucket-info"
import { RemittanceChart } from "./remittance-chart"

interface Props {
  summary: Panel<SalesSummary>
  range: DateRange
  skin: PlatformSkin
}

const TILE_GRID: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

/**
 * The centerpiece: who remits the tax on this merchant's sales. Everything
 * here is the platform's own data (`get_sales_summary`), so it renders even
 * when the merchant has not connected a Numeral account.
 */
export function RemittanceSplitHero({ summary, range, skin }: Props) {
  if (!summary.ok) {
    return (
      <PanelError
        title="Could not load your sales split"
        message={summary.error.message}
        code={summary.code}
      />
    )
  }

  const split = splitRemittance(summary.data.rows, range)
  const byBucket = new Map(split.totals.map((total) => [total.bucket, total]))
  const chartSeries = split.presentBuckets.filter((bucket) => (byBucket.get(bucket)?.taxMinor ?? 0) > 0)
  const labels: Record<LiabilityBucket, string> = {
    platform_remits: bucketLabel("platform_remits", skin),
    merchant_remits: bucketLabel("merchant_remits", skin),
    platform_fees: bucketLabel("platform_fees", skin),
    off_platform: bucketLabel("off_platform", skin),
  }
  const tiles = split.presentBuckets
    .map((bucket) => byBucket.get(bucket))
    .filter((total): total is BucketTotals => total !== undefined)
  const rangeLabel = `${formatMonth(range.from.slice(0, 7))} – ${formatMonth(range.to.slice(0, 7))}`

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Who remits the tax on your sales</CardTitle>
            <CardDescription>
              Tax collected on {skin.name}, last 12 months ({rangeLabel}), split by who files it.
            </CardDescription>
          </div>
          <RecordedBadge trace={summary.trace} />
        </div>
        <ReconciledSentence split={byBucket} skin={skin} />
      </CardHeader>
      <CardContent className="space-y-6">
        {tiles.length > 0 ? (
          <div className={`grid gap-3 ${TILE_GRID[tiles.length] ?? TILE_GRID[4]}`}>
            {tiles.map((total) => (
              <BucketTile key={total.bucket} total={total} skin={skin} />
            ))}
          </div>
        ) : null}
        {chartSeries.length > 0 ? (
          <RemittanceChart months={split.months} series={chartSeries} labels={labels} />
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No tax was collected in this period.
          </p>
        )}
        {split.nonUsOrders > 0 ? (
          <p className="text-muted-foreground text-xs">
            Includes {formatCount(split.nonUsOrders)} {split.nonUsOrders === 1 ? "order" : "orders"} shipped outside
            the US, shown in USD.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ReconciledSentence({ split, skin }: { split: Map<LiabilityBucket, BucketTotals>; skin: PlatformSkin }) {
  const platform = split.get("platform_remits")?.taxMinor ?? 0
  const merchant = split.get("merchant_remits")?.taxMinor ?? 0
  const fees = split.get("platform_fees")?.taxMinor ?? 0
  const offPlatform = split.get("off_platform")
  const storefront = skin.storefrontChannel.toLowerCase()
  return (
    <p className="max-w-3xl text-base leading-relaxed">
      On {skin.name} over the last 12 months: {skin.name} remitted <Money minor={platform} /> as marketplace
      facilitator on {skin.marketplaceChannel} sales; you remit <Money minor={merchant} /> on {storefront} sales;
      tax on {skin.name} fees <Money minor={fees} />
      {offPlatform && offPlatform.liabilities.length > 0 ? (
        <>
          ; <Money minor={offPlatform.taxMinor} /> recorded off-platform
        </>
      ) : null}
      .
    </p>
  )
}

function Money({ minor }: { minor: number }) {
  return <strong className="font-semibold tabular-nums">{formatMinorUsd(minor)}</strong>
}

function BucketTile({ total, skin }: { total: BucketTotals; skin: PlatformSkin }) {
  const explanation = bucketExplanation(total.bucket, skin)
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: BUCKET_COLORS[total.bucket] }}
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {bucketLabel(total.bucket, skin)}
        </p>
        <span className="ml-auto">
          <BucketInfo label={bucketLabel(total.bucket, skin)} summary={explanation.summary} roles={explanation.roles} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{formatMinorUsd(total.taxMinor)}</p>
      <p className="text-muted-foreground text-xs">tax collected</p>
      <dl className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt>Net sales</dt>
          <dd className="text-foreground tabular-nums">{formatMinorUsd(total.salesMinor, { cents: false })}</dd>
        </div>
        <div>
          <dt>Orders</dt>
          <dd className="text-foreground tabular-nums">{formatCount(total.orders)}</dd>
        </div>
      </dl>
    </div>
  )
}
