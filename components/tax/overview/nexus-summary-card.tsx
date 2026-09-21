import { Hourglass } from "lucide-react"
import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCount, formatDate, formatMinorUsd, formatPercent } from "@/lib/format"
import type { NexusStudy, Panel } from "@/lib/numeral"
import type { PlatformSkin } from "@/platform.config"
import { stateOf, summarizeNexus } from "./aggregate"
import { TabLink } from "./tab-link"

/**
 * Where the merchant stands across states, and the beat the demo is built
 * around: in some states the platform's marketplace sales count toward the
 * merchant's threshold and in others they do not.
 */
export function NexusSummaryCard({ study, skin }: { study: Panel<NexusStudy>; skin: PlatformSkin }) {
  if (!study.ok) {
    return <PanelError title="Could not load your nexus study" message={study.error.message} code={study.code} />
  }

  if (study.data.study_status === "pending_first_run") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Nexus</CardTitle>
            <RecordedBadge trace={study.trace} />
          </div>
        </CardHeader>
        <CardContent className="flex items-start gap-3">
          <Hourglass className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Numeral is running your first study</p>
            <p className="text-muted-foreground">
              State-by-state thresholds will appear here once it finishes. Nothing is needed from you.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <TabLink href="/dashboard/tax/nexus">Open Nexus</TabLink>
        </CardFooter>
      </Card>
    )
  }

  const summary = summarizeNexus(study.data)
  const top = summary.topApproaching
  const topEconomic = top?.economic ?? null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Nexus</CardTitle>
            <CardDescription>
              {study.data.jurisdictions.length} states studied
              {study.data.run_date ? ` · run ${formatDate(study.data.run_date)}` : ""}
            </CardDescription>
          </div>
          <RecordedBadge trace={study.trace} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-2">
          <Count label="Have nexus" value={summary.hasNexus} tone="strong" />
          <Count label="Approaching" value={summary.approaching} tone="warn" />
          <Count label="Safe" value={summary.safe} tone="muted" />
        </dl>

        {top && topEconomic ? (
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">Closest to crossing: {top.jurisdiction_name}</span>
              <span className="tabular-nums">{formatPercent(topEconomic.threshold_percent)}</span>
            </div>
            <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full" role="presentation">
              <div
                className="h-full rounded-full bg-amber-600"
                style={{ width: `${Math.min(100, topEconomic.threshold_percent)}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs tabular-nums">
              {formatMinorUsd(topEconomic.current_qualifying_sales_amount, { cents: false })} of{" "}
              {formatMinorUsd(topEconomic.rule?.sales_threshold, { cents: false })}
              {topEconomic.rule?.volume_threshold
                ? ` · ${formatCount(topEconomic.current_qualifying_transaction_count)} of ${formatCount(topEconomic.rule.volume_threshold)} orders`
                : ""}{" "}
              · {stateOf(top)}
            </p>
          </div>
        ) : null}

        <p className="text-sm leading-relaxed">
          In <strong className="tabular-nums">{summary.marketplaceCounts}</strong>{" "}
          {summary.marketplaceCounts === 1 ? "state" : "states"}, your {skin.marketplaceChannel} sales count toward the
          threshold; in <strong className="tabular-nums">{summary.marketplaceExcluded}</strong> they do not.
        </p>
      </CardContent>
      <CardFooter>
        <TabLink href="/dashboard/tax/nexus">See every state</TabLink>
      </CardFooter>
    </Card>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone: "strong" | "warn" | "muted" }) {
  const color = tone === "strong" ? "text-foreground" : tone === "warn" ? "text-amber-700" : "text-muted-foreground"
  return (
    <div className="rounded-lg border p-2.5">
      <dd className={`text-xl font-semibold tabular-nums ${color}`}>{value}</dd>
      <dt className="text-muted-foreground text-xs">{label}</dt>
    </div>
  )
}
