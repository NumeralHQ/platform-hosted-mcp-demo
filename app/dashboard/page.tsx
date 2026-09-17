import Link from "next/link"
import { ArrowRight, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { bucketOf } from "@/lib/liability"
import { formatCount, formatDate, formatMinorUsd } from "@/lib/format"
import { getSalesSummary, listFilings, trailingMonths } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"
import { DateTime } from "luxon"

export default async function DashboardHome() {
  const merchant = await requireMerchant()
  const skin = await currentSkin()
  const range = trailingMonths(12)
  const today = DateTime.utc()
  const [summary, upcoming] = await Promise.all([
    getSalesSummary(merchant.merchantId, range),
    listFilings(merchant.merchantId, { dueAfter: today.toISODate() ?? undefined, limit: 50 }),
  ])

  let grossMinor = 0
  let orders = 0
  let platformRemitsMinor = 0
  if (summary.ok) {
    for (const row of summary.data.rows) {
      if (bucketOf(row.liability) === "platform_fees") {
        continue
      }
      grossMinor += row.total_sales
      orders += row.transaction_count
      if (bucketOf(row.liability) === "platform_remits") {
        platformRemitsMinor += row.tax_collected
      }
    }
  }
  const nextDue = upcoming.ok
    ? upcoming.data.filings
        .filter((filing) => filing.status !== "filed" && filing.due_on)
        .sort((a, b) => (a.due_on ?? "").localeCompare(b.due_on ?? ""))[0]
    : undefined

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {merchant.merchantName}</h1>
        <p className="text-muted-foreground text-sm">Here is how your {skin.name} business is doing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Net sales, last 12 months" value={formatMinorUsd(grossMinor, { cents: false })} hint={`Across ${skin.marketplaceChannel} and ${skin.storefrontChannel.toLowerCase()}`} />
        <Tile label="Orders" value={formatCount(orders)} hint="Purchases net of refunds" />
        <Tile label={`Tax ${skin.name} remitted for you`} value={formatMinorUsd(platformRemitsMinor, { cents: false })} hint="As marketplace facilitator, last 12 months" />
      </div>

      <Card className="border-l-4 border-l-red-600">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-red-50 p-2 text-red-700">
              <Landmark className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">Tax</CardTitle>
              <CardDescription>
                {nextDue
                  ? `Your ${nextDue.state ?? nextDue.jurisdiction_id} return is due ${formatDate(nextDue.due_on)}.`
                  : "Your filings, nexus, and registrations, pulled live from your tax provider."}
              </CardDescription>
            </div>
          </div>
          <Button render={<Link href="/dashboard/tax" />} size="sm">
            Open Tax <ArrowRight className="ml-1 size-4" />
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <MockCard title="Recent payouts" body={`Payouts settle every Tuesday. This panel is ${skin.name} mock data.`} />
        <MockCard title="Community growth" body={`Member counts and churn would live here. This panel is ${skin.name} mock data.`} />
      </div>
    </div>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}

function MockCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  )
}
