import Link from "next/link"
import { Plus } from "lucide-react"
import { ActivityFeed } from "@/components/home/activity-feed"
import { AttentionList } from "@/components/home/attention-list"
import { BalanceCard } from "@/components/home/balance-card"
import { KpiTile } from "@/components/home/kpi-tile"
import { NetSalesChart } from "@/components/home/net-sales-chart"
import { ShareList } from "@/components/home/share-list"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCount, formatMinorUsd } from "@/lib/format"
import {
  headline,
  monthlySales,
  platformFeeRate,
  recentActivity,
  sortAttention,
  taxAttention,
  topStates,
} from "@/lib/home/aggregate"
import { audience, balance, catalog, platformAttention } from "@/lib/home/platform-data"
import {
  getNexusStudy,
  getSalesSummary,
  getTransaction,
  listFilings,
  listTransactions,
  trailingMonths,
  type TransactionDetail,
} from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"
import { DateTime } from "luxon"

/** How many of the newest transactions get a detail read for the activity feed. */
const RECENT_DETAILS = 12
const SHIPPABLE_ORDERS = 4

/**
 * The merchant's home: how the business is doing this month, what needs
 * doing, and what just happened. Sales, activity, and the two tax rows come
 * from Numeral; balance, audience, and catalog are the platform's own.
 */
export default async function DashboardHome() {
  const [merchant, skin] = await Promise.all([requireMerchant(), currentSkin()])
  const today = DateTime.utc()
  const range = trailingMonths(12, today)

  const [summary, transactions, filings, nexus] = await Promise.all([
    getSalesSummary(merchant.merchantId, range),
    listTransactions(merchant.merchantId, { limit: 25 }),
    listFilings(merchant.merchantId),
    getNexusStudy(merchant.merchantId),
  ])

  const details = new Map<string, TransactionDetail>()
  if (transactions.ok) {
    const fetched = await Promise.all(
      transactions.data.transactions.slice(0, RECENT_DETAILS).map((tx) => getTransaction(tx.id))
    )
    for (const detail of fetched) {
      if (detail.ok) {
        details.set(detail.data.id, detail.data)
      }
    }
  }

  const rows = summary.ok ? summary.data.rows : []
  const months = monthlySales(rows)
  const head = headline(months)
  const money = balance({ headline: head, feeRate: platformFeeRate(rows), today })
  const people = audience(head)
  const products = catalog(skin, head)
  const states = topStates(rows)
  const activity = transactions.ok ? recentActivity(transactions.data.transactions, details) : []
  const attention = sortAttention([
    ...platformAttention({ skin, balance: money, shippable: SHIPPABLE_ORDERS }),
    ...taxAttention({
      filings: filings.ok ? filings.data.filings : null,
      nexus: nexus.ok ? nexus.data : null,
      today,
    }),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting(today)}, {merchant.merchantName}
          </h1>
          <p className="text-muted-foreground text-sm">{today.toFormat("cccc, LLLL d")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
            {skin.home.secondaryAction}
          </Button>
          <Button render={<Link href="/dashboard" />} nativeButton={false}>
            <Plus className="size-4" />
            {skin.home.primaryAction}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label={`Net sales · ${head?.monthLabel ?? "this month"}`}
          value={formatMinorUsd(head?.sales ?? 0, { cents: false })}
          delta={head?.salesDelta}
          hint="vs the month before"
        />
        <KpiTile
          label={`Orders · ${head?.monthLabel ?? "this month"}`}
          value={formatCount(head?.orders ?? 0)}
          delta={head?.ordersDelta}
          hint="Purchases net of refunds"
        />
        <KpiTile
          label={`Active ${skin.home.audienceNoun}`}
          value={formatCount(people.active)}
          delta={people.delta}
          hint={`${formatCount(people.joinedThisMonth)} joined this month`}
        />
        <KpiTile
          label="Last 12 months"
          value={formatMinorUsd(head?.trailingSales ?? 0, { compact: true, cents: false })}
          hint={`Across ${skin.marketplaceChannel} and ${skin.storefrontChannel.toLowerCase()}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Net sales</CardTitle>
            <CardDescription>Monthly, after refunds, before {skin.name} fees.</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" render={<Link href="/dashboard/tax/sales" />} nativeButton={false}>
                Sales report
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {summary.ok ? (
              <NetSalesChart data={months} color={skin.accent.chart} />
            ) : (
              <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
                Sales are temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>
        <BalanceCard balance={money} platformName={skin.name} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <AttentionList items={attention} />
          <ShareList
            title="Top products"
            description={`Net sales, ${head?.monthLabel ?? "this month"}`}
            rows={products.map((product) => ({
              key: product.name,
              label: product.name,
              sublabel: product.kind,
              sales: product.sales,
              share: product.share,
            }))}
            color={skin.accent.chart}
          />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <ActivityFeed items={activity} error={transactions.ok ? null : "Recent orders are temporarily unavailable."} />
          <ShareList
            title="Where your buyers are"
            description="Share of US net sales, last 12 months"
            rows={states.map((state) => ({ key: state.code, label: state.name, sales: state.sales, share: state.share }))}
            color={skin.accent.chart}
            empty="No US sales in the last 12 months."
          />
        </div>
      </div>
    </div>
  )
}

function greeting(now: DateTime): string {
  if (now.hour < 12) {
    return "Good morning"
  }
  if (now.hour < 18) {
    return "Good afternoon"
  }
  return "Good evening"
}
