import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { UnderTheHood } from "@/components/tax/under-the-hood"
import { buildMatrix, buildMonthly, describeError, METRIC_LABELS, METRICS, MONTH_OPTIONS, trendTitle } from "@/components/tax/sales/aggregate"
import { ExportButtons } from "@/components/tax/sales/export-buttons"
import { MonthlyTrendChart } from "@/components/tax/sales/monthly-trend-chart"
import { SegmentedLinks } from "@/components/tax/sales/segmented-links"
import { SplitMatrixTable } from "@/components/tax/sales/split-matrix-table"
import { TransactionDetailPanel } from "@/components/tax/sales/transaction-detail"
import { TransactionsTable } from "@/components/tax/sales/transactions-table"
import { transactionWindow } from "@/components/tax/sales/transactions-range"
import { parseSalesParams, salesHref, type SearchParams } from "@/components/tax/sales/url"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import { bucketLabel, type LiabilityBucket } from "@/lib/liability"
import { currentMode, currentTrace, getSalesSummary, getTransaction, listTransactions, trailingMonths } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

/**
 * Sales: the platform's own view of the merchant's orders, split by who
 * remits the tax on them. Everything the page shows is derived from three
 * Numeral reads (`get_sales_summary`, `list_transactions`, `get_transaction`)
 * and every control is a link, so the URL is the whole state.
 */
export default async function SalesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [merchant, skin, params] = await Promise.all([requireMerchant(), currentSkin(), searchParams.then(parseSalesParams)])
  const range = trailingMonths(params.months)
  const window = transactionWindow(range)

  const [summary, transactions, detail] = await Promise.all([
    getSalesSummary(merchant.merchantId, range),
    listTransactions(merchant.merchantId, {
      limit: 25,
      cursor: params.cursor ?? undefined,
      processedAfter: window.processedAfter,
      processedBefore: window.processedBefore,
    }),
    params.tx ? getTransaction(params.tx) : Promise.resolve(null),
  ])

  const labels: Record<LiabilityBucket, string> = {
    platform_remits: bucketLabel("platform_remits", skin),
    merchant_remits: bucketLabel("merchant_remits", skin),
    platform_fees: bucketLabel("platform_fees", skin),
    off_platform: bucketLabel("off_platform", skin),
  }
  const matrix = summary.ok ? buildMatrix(summary.data.rows, params.metric) : null
  const monthly = summary.ok ? buildMonthly(summary.data.rows, params.metric) : null

  const rangeOptions = MONTH_OPTIONS.map((months) => ({
    label: `${months} months`,
    href: salesHref(params, { months, cursor: null, prev: [], tx: null }),
    active: params.months === months,
  }))
  const metricOptions = METRICS.map((metric) => ({
    label: METRIC_LABELS[metric],
    href: salesHref(params, { metric }),
    active: params.metric === metric,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Sales and who remits</h2>
          <p className="text-muted-foreground text-sm">
            Orders through {skin.marketplaceChannel} and {skin.storefrontChannel.toLowerCase()},{" "}
            {formatDate(range.from)} – {formatDate(range.to)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedLinks label="Date range" options={rangeOptions} />
          <ExportButtons months={params.months} metric={params.metric} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Split by state <RecordedBadge trace={summary.trace} />
          </CardTitle>
          <CardDescription>
            {METRIC_LABELS[params.metric]} per state, by who is responsible for remitting the tax. Hover a column
            for what it means.
          </CardDescription>
          <CardAction>
            <SegmentedLinks label="Metric" options={metricOptions} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {matrix ? (
            <SplitMatrixTable matrix={matrix} metric={params.metric} skin={skin} />
          ) : (
            <PanelError
              title="Sales summary could not be loaded"
              message={describeError(summary.ok ? null : summary.code, summary.ok ? "" : summary.error.message)}
              code={summary.ok ? null : summary.code}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {trendTitle(params.metric)} <RecordedBadge trace={summary.trace} />
          </CardTitle>
          <CardDescription>Each bar is one month; segments are the remitting party.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthly ? (
            <MonthlyTrendChart data={monthly} metric={params.metric} labels={labels} />
          ) : (
            <PanelError
              title="Trend could not be loaded"
              message={describeError(summary.ok ? null : summary.code, summary.ok ? "" : summary.error.message)}
              code={summary.ok ? null : summary.code}
            />
          )}
        </CardContent>
      </Card>

      <div className={detail ? "grid gap-6 lg:grid-cols-5" : ""}>
        <Card className={detail ? "lg:col-span-3" : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Transactions <RecordedBadge trace={transactions.trace} />
            </CardTitle>
            <CardDescription>Newest first. Select an order to see its line items, tax, and jurisdictions.</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.ok ? (
              <TransactionsTable page={transactions.data} params={params} skin={skin} />
            ) : (
              <PanelError
                title="Transactions could not be loaded"
                message={describeError(transactions.code, transactions.error.message)}
                code={transactions.code}
              />
            )}
          </CardContent>
        </Card>
        {detail && (
          <div className="lg:col-span-2">
            <TransactionDetailPanel panel={detail} closeHref={salesHref(params, { tx: null })} />
          </div>
        )}
      </div>

      <UnderTheHood trace={await currentTrace()} mode={(await currentMode()).mode} />
    </div>
  )
}
