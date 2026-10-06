import { DateTime } from "luxon"
import { formatDate, formatPeriod } from "@/lib/format"
import { BUCKET_ORDER, bucketOf, type LiabilityBucket } from "@/lib/liability"
import type {
  FilingSummary,
  NexusJurisdiction,
  NexusStudy,
  Registration,
  SalesSummaryRow,
} from "@/lib/numeral/schemas"

/**
 * Pure reshaping of Numeral responses for the Tax overview. Nothing here
 * formats or fetches; every number stays in the unit the tool returned it in
 * (sales summary and nexus in minor units, filings in dollars) so the
 * component that renders it picks the matching formatter.
 */

// ---------------------------------------------------------------------------
// Sales summary → remittance split
// ---------------------------------------------------------------------------

export interface BucketTotals {
  bucket: LiabilityBucket
  /** Minor units. */
  taxMinor: number
  /** Minor units. */
  salesMinor: number
  orders: number
  /** Numeral liability literals seen in the rows that fed this bucket. */
  liabilities: string[]
}

/** One bar in the monthly chart. Amounts are minor units per bucket. */
export type MonthPoint = { month: string } & Record<LiabilityBucket, number>

export interface RemittanceSplit {
  /** Every bucket in BUCKET_ORDER, including ones with no rows (zeroes). */
  totals: BucketTotals[]
  /** Buckets that had at least one row, in BUCKET_ORDER. */
  presentBuckets: LiabilityBucket[]
  /** One point per month in the range, ascending, including empty months. */
  months: MonthPoint[]
  /** Rows whose country is not US; the hero footnotes them. */
  nonUsOrders: number
}

function emptyPoint(month: string): MonthPoint {
  return { month, platform_remits: 0, merchant_remits: 0, platform_fees: 0, off_platform: 0 }
}

function monthsBetween(from: string, to: string): string[] {
  const start = DateTime.fromISO(from, { zone: "utc" }).startOf("month")
  const end = DateTime.fromISO(to, { zone: "utc" }).startOf("month")
  if (!start.isValid || !end.isValid || end < start) {
    return []
  }
  const out: string[] = []
  let cursor = start
  while (cursor <= end) {
    out.push(cursor.toFormat("yyyy-LL"))
    cursor = cursor.plus({ months: 1 })
  }
  return out
}

export function splitRemittance(rows: readonly SalesSummaryRow[], range: { from: string; to: string }): RemittanceSplit {
  const totals = new Map<LiabilityBucket, BucketTotals>()
  for (const bucket of BUCKET_ORDER) {
    totals.set(bucket, { bucket, taxMinor: 0, salesMinor: 0, orders: 0, liabilities: [] })
  }
  const byMonth = new Map<string, MonthPoint>()
  for (const month of monthsBetween(range.from, range.to)) {
    byMonth.set(month, emptyPoint(month))
  }
  let nonUsOrders = 0

  for (const row of rows) {
    const bucket = bucketOf(row.liability)
    const total = totals.get(bucket)
    if (!total) {
      throw new Error(`bucketOf returned an unknown bucket: ${bucket}`)
    }
    total.taxMinor += row.tax_collected
    total.salesMinor += row.total_sales
    total.orders += row.transaction_count
    if (!total.liabilities.includes(row.liability)) {
      total.liabilities.push(row.liability)
    }
    if (row.country !== "US") {
      nonUsOrders += row.transaction_count
    }
    const point = byMonth.get(row.month) ?? emptyPoint(row.month)
    point[bucket] += row.tax_collected
    byMonth.set(row.month, point)
  }

  const ordered = BUCKET_ORDER.map((bucket) => totals.get(bucket)).filter(
    (total): total is BucketTotals => total !== undefined
  )
  return {
    totals: ordered,
    presentBuckets: ordered.filter((total) => total.liabilities.length > 0).map((total) => total.bucket),
    months: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
    nonUsOrders,
  }
}

// ---------------------------------------------------------------------------
// Nexus study → counts and the marketplace-rule beat
// ---------------------------------------------------------------------------

export interface NexusSummary {
  hasNexus: number
  approaching: number
  safe: number
  /** Highest threshold_percent among status === "approaching", if any. */
  topApproaching: NexusJurisdiction | null
  /** States whose rule counts marketplace sales toward the threshold. */
  marketplaceCounts: number
  /** States whose rule excludes marketplace sales. */
  marketplaceExcluded: number
}

export function summarizeNexus(study: NexusStudy): NexusSummary {
  let hasNexus = 0
  let approaching = 0
  let safe = 0
  let marketplaceCounts = 0
  let marketplaceExcluded = 0
  let topApproaching: NexusJurisdiction | null = null

  for (const jurisdiction of study.jurisdictions) {
    switch (jurisdiction.status) {
      case "has_nexus":
        hasNexus += 1
        break
      case "approaching":
        approaching += 1
        if (jurisdiction.economic && jurisdiction.economic.threshold_percent > (topApproaching?.economic?.threshold_percent ?? -1)) {
          topApproaching = jurisdiction
        }
        break
      case "safe":
        safe += 1
        break
    }
    const rule = jurisdiction.economic?.rule
    if (rule) {
      if (rule.marketplace_sales_count_toward_threshold) {
        marketplaceCounts += 1
      } else {
        marketplaceExcluded += 1
      }
    }
  }

  return { hasNexus, approaching, safe, topApproaching, marketplaceCounts, marketplaceExcluded }
}

// ---------------------------------------------------------------------------
// Filings → the next one due
// ---------------------------------------------------------------------------

/** Statuses after which nothing is owed on the return itself. */
const SETTLED_FILING_STATUSES: ReadonlySet<string> = new Set(["filed", "canceled"])

export const AWAITING_APPROVAL_STATUS = "pending_client_approval"

export interface FilingOutlook {
  next: FilingSummary | null
  awaitingApproval: number
  openCount: number
}

export function filingOutlook(filings: readonly FilingSummary[]): FilingOutlook {
  const open = filings.filter((filing) => filing.status === null || !SETTLED_FILING_STATUSES.has(filing.status))
  const dated = open
    .filter((filing) => filing.due_on !== null)
    .sort((a, b) => (a.due_on ?? "").localeCompare(b.due_on ?? ""))
  return {
    next: dated[0] ?? null,
    awaitingApproval: open.filter((filing) => filing.status === AWAITING_APPROVAL_STATUS).length,
    openCount: open.length,
  }
}

// ---------------------------------------------------------------------------
// Registrations → registered vs in progress
// ---------------------------------------------------------------------------

export const REGISTERED_STATUSES: ReadonlySet<string> = new Set([
  "online_account_created",
  "fully_transferred",
  "complete",
  "ready_to_file",
])

export const IN_PROGRESS_STATUSES: ReadonlySet<string> = new Set([
  "onboarding",
  "in_progress",
  "ops_review",
  "waiting_for_mail",
  "documents_received",
  "incomplete",
  "pending_2fa",
])

export interface RegistrationSummary {
  registered: Registration[]
  inProgress: Registration[]
  other: Registration[]
}

export function summarizeRegistrations(registrations: readonly Registration[]): RegistrationSummary {
  const registered: Registration[] = []
  const inProgress: Registration[] = []
  const other: Registration[] = []
  for (const registration of registrations) {
    if (registration.status && REGISTERED_STATUSES.has(registration.status)) {
      registered.push(registration)
    } else if (registration.status && IN_PROGRESS_STATUSES.has(registration.status)) {
      inProgress.push(registration)
    } else {
      other.push(registration)
    }
  }
  return { registered, inProgress, other }
}

/** State code for display, falling back to the jurisdiction id. */
export function stateOf(item: { state_code: string | null; jurisdiction_id: string }): string {
  return item.state_code ?? item.jurisdiction_id.replace(/^US-/, "")
}

// ---------------------------------------------------------------------------
// What changed → derived events
// ---------------------------------------------------------------------------

export type ChangeKind = "due" | "approaching" | "filed" | "crossed"

export interface ChangeEvent {
  kind: ChangeKind
  /** ISO date the event is ordered by. */
  date: string
  title: string
  detail: string
  href: string
  /** Fields on the Numeral response the line was derived from. */
  source: string
}

const APPROACHING_PERCENT = 80
const RECENTLY_FILED_DAYS = 60
const MIN_EVENTS = 4
const MAX_EVENTS = 6

export function deriveChanges(args: {
  study: NexusStudy | null
  filings: readonly FilingSummary[]
  marketplaceChannel: string
  today?: DateTime
}): ChangeEvent[] {
  const today = args.today ?? DateTime.utc()
  const events: ChangeEvent[] = []

  const outlook = filingOutlook(args.filings)
  if (outlook.next?.due_on) {
    const filing = outlook.next
    events.push({
      kind: "due",
      date: filing.due_on ?? "",
      title: `${filing.state ?? filing.jurisdiction_id} return due ${formatDate(filing.due_on)}`,
      detail:
        filing.status === AWAITING_APPROVAL_STATUS
          ? `Period ${formatPeriod(filing.period_starts_at, filing.period_ends_at)}. Waiting for your approval.`
          : `Period ${formatPeriod(filing.period_starts_at, filing.period_ends_at)}. Status: ${(filing.status ?? "unknown").replace(/_/g, " ")}.`,
      href: "/dashboard/tax/filings",
      source: "list_filings.due_on, status",
    })
  }

  if (args.study && args.study.study_status === "available") {
    const approaching = args.study.jurisdictions
      .filter(
        (jurisdiction) =>
          !jurisdiction.has_nexus &&
          jurisdiction.economic !== null &&
          jurisdiction.economic.threshold_percent >= APPROACHING_PERCENT
      )
      .sort((a, b) => (b.economic?.threshold_percent ?? 0) - (a.economic?.threshold_percent ?? 0))
    if (approaching.length > 0) {
      const names = approaching.map(
        (jurisdiction) => `${stateOf(jurisdiction)} ${Math.round(jurisdiction.economic?.threshold_percent ?? 0)}%`
      )
      events.push({
        kind: "approaching",
        date: args.study.run_date ?? today.toISODate() ?? "",
        title:
          approaching.length === 1
            ? `${stateOf(approaching[0])} is approaching its threshold`
            : `${approaching.length} states are approaching their thresholds`,
        detail: `${names.join(", ")} of the economic-nexus threshold, counting ${args.marketplaceChannel} sales where the state does.`,
        href: "/dashboard/tax/nexus",
        source: "get_nexus_study.economic.threshold_percent",
      })
    }

    for (const jurisdiction of args.study.jurisdictions) {
      const crossed = jurisdiction.economic?.earliest_crossing_date
      if (!jurisdiction.has_nexus || !crossed) {
        continue
      }
      const rule = jurisdiction.economic?.rule
      const marketplaceNote = rule
        ? rule.marketplace_sales_count_toward_threshold
          ? `${args.marketplaceChannel} sales counted toward the threshold.`
          : `${args.marketplaceChannel} sales did not count; your own sales crossed it alone.`
        : ""
      events.push({
        kind: "crossed",
        date: crossed,
        title: `Crossed the economic-nexus threshold in ${jurisdiction.jurisdiction_name}`,
        detail: [
          jurisdiction.collection_start_date ? `Collection starts ${formatDate(jurisdiction.collection_start_date)}.` : null,
          marketplaceNote || null,
        ]
          .filter((part): part is string => part !== null)
          .join(" "),
        href: "/dashboard/tax/nexus",
        source: "get_nexus_study.economic.earliest_crossing_date",
      })
    }
  }

  const recentCutoff = today.minus({ days: RECENTLY_FILED_DAYS })
  for (const filing of args.filings) {
    if (filing.status !== "filed" || !filing.filed_at) {
      continue
    }
    const filedAt = DateTime.fromISO(filing.filed_at, { zone: "utc" })
    if (!filedAt.isValid || filedAt < recentCutoff) {
      continue
    }
    const late = filing.due_on ? filedAt > DateTime.fromISO(filing.due_on, { zone: "utc" }) : false
    events.push({
      kind: "filed",
      date: filing.filed_at,
      title: `${filing.state ?? filing.jurisdiction_id} ${formatPeriod(filing.period_starts_at, filing.period_ends_at)} return filed`,
      detail: late
        ? `Filed ${formatDate(filing.filed_at)}, after the ${formatDate(filing.due_on)} due date.`
        : `Filed ${formatDate(filing.filed_at)}, ahead of the ${formatDate(filing.due_on)} due date.`,
      href: "/dashboard/tax/filings",
      source: "list_filings.filed_at",
    })
  }

  events.sort((a, b) => b.date.localeCompare(a.date))
  return events.slice(0, Math.max(MIN_EVENTS, Math.min(MAX_EVENTS, events.length)))
}
