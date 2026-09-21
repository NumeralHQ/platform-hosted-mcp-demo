import { DateTime } from "luxon"
import { stateName } from "@/components/tax/sales/states"
import { AWAITING_APPROVAL_STATUS, filingOutlook } from "@/components/tax/overview/aggregate"
import { formatDate, formatMonth, formatPercent, formatUsd } from "@/lib/format"
import { bucketOf } from "@/lib/liability"
import type {
  FilingSummary,
  NexusStudy,
  SalesSummaryRow,
  TransactionDetail,
  TransactionSummary,
} from "@/lib/numeral/schemas"

/**
 * Pure shaping for the merchant home page. Everything here turns Numeral
 * responses into the handful of numbers and rows the page renders; nothing
 * fetches, so it is all unit-testable.
 */

// ---------------------------------------------------------------------------
// Net sales by month → headline numbers
// ---------------------------------------------------------------------------

export interface MonthPoint {
  month: string
  /** Minor units, platform fee rows excluded. */
  sales: number
  orders: number
}

/** Net sales and order counts per month, ignoring the platform's own fee rows. */
export function monthlySales(rows: readonly SalesSummaryRow[]): MonthPoint[] {
  const byMonth = new Map<string, MonthPoint>()
  for (const row of rows) {
    if (bucketOf(row.liability) === "platform_fees") {
      continue
    }
    const point = byMonth.get(row.month) ?? { month: row.month, sales: 0, orders: 0 }
    point.sales += row.total_sales
    point.orders += row.transaction_count
    byMonth.set(row.month, point)
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export interface Headline {
  /** The most recent closed month, e.g. "Aug 2026". */
  monthLabel: string
  sales: number
  orders: number
  /** Fractional change against the prior month; null when there is no prior month or it was zero. */
  salesDelta: number | null
  ordersDelta: number | null
  /** Trailing total across every month in the range. */
  trailingSales: number
}

export function headline(points: readonly MonthPoint[]): Headline | null {
  const last = points[points.length - 1]
  if (!last) {
    return null
  }
  const prior = points[points.length - 2]
  return {
    monthLabel: formatMonth(last.month),
    sales: last.sales,
    orders: last.orders,
    salesDelta: delta(last.sales, prior?.sales),
    ordersDelta: delta(last.orders, prior?.orders),
    trailingSales: points.reduce((sum, point) => sum + point.sales, 0),
  }
}

function delta(current: number, prior: number | undefined): number | null {
  if (prior === undefined || prior === 0) {
    return null
  }
  return (current - prior) / prior
}

/** "+12%" / "−4%" for a fractional delta. */
export function formatDelta(fraction: number | null): string | null {
  if (fraction === null) {
    return null
  }
  const pct = Math.round(fraction * 100)
  if (pct === 0) {
    return "0%"
  }
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`
}

/** Share of gross sales the platform kept as fees over the range; 0 when unknown. */
export function platformFeeRate(rows: readonly SalesSummaryRow[]): number {
  let fees = 0
  let sales = 0
  for (const row of rows) {
    if (bucketOf(row.liability) === "platform_fees") {
      fees += row.total_sales
    } else {
      sales += row.total_sales
    }
  }
  return sales === 0 ? 0 : fees / sales
}

// ---------------------------------------------------------------------------
// Where the buyers are
// ---------------------------------------------------------------------------

export interface StateShare {
  code: string
  name: string
  /** Minor units. */
  sales: number
  /** 0–1 share of US sales in the range. */
  share: number
}

/** Top US states by net sales over the range. */
export function topStates(rows: readonly SalesSummaryRow[], limit = 5): StateShare[] {
  const byState = new Map<string, number>()
  let total = 0
  for (const row of rows) {
    if (row.country !== "US" || !row.state || bucketOf(row.liability) === "platform_fees") {
      continue
    }
    byState.set(row.state, (byState.get(row.state) ?? 0) + row.total_sales)
    total += row.total_sales
  }
  return [...byState.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code, sales]) => ({ code, name: stateName(code), sales, share: total === 0 ? 0 : sales / total }))
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

export interface ActivityItem {
  key: string
  kind: "purchase" | "refund"
  /** What was bought, when the detail is known. */
  title: string
  /** "Atlanta, GA". */
  place: string | null
  /** Minor units including tax; null when the detail was not available. */
  amount: number | null
  processedAt: string
  href: string
}

const FEE_TAX_CODE = "PAYMENT_PROCESSING_SERVICES"

/**
 * One row per order from the most recent transactions. A transaction may
 * arrive as two records (the sale and the platform's fee on it), so rows are
 * grouped by order and fee-only line items are ignored. Details are optional:
 * a row still renders without one, just without the product and amount.
 */
export function recentActivity(
  transactions: readonly TransactionSummary[],
  details: ReadonlyMap<string, TransactionDetail>,
  limit = 6
): ActivityItem[] {
  const byOrder = new Map<string, ActivityItem>()
  for (const tx of transactions) {
    const orderKey = tx.reference_order_id ?? tx.id
    const detail = details.get(tx.id)
    const goods = detail?.line_items.filter((line) => line.product.product_tax_code !== FEE_TAX_CODE) ?? []
    const existing = byOrder.get(orderKey)
    const isRefund = tx.type.toUpperCase().includes("REFUND")
    const amount = goods.length ? goods.reduce((sum, line) => sum + line.amount_including_tax, 0) : null
    const product = goods[0]?.product.reference_product_name ?? null
    if (existing) {
      if (existing.amount === null && amount !== null) {
        existing.amount = isRefund ? -Math.abs(amount) : amount
        existing.title = titleFor(product, goods.length, isRefund)
        existing.href = `/dashboard/tax/sales?tx=${encodeURIComponent(tx.id)}`
      }
      continue
    }
    byOrder.set(orderKey, {
      key: orderKey,
      kind: isRefund ? "refund" : "purchase",
      title: titleFor(product, goods.length, isRefund),
      place: tx.address_city && tx.address_province ? `${tx.address_city}, ${tx.address_province}` : tx.address_province,
      amount: isRefund && amount !== null ? -Math.abs(amount) : amount,
      processedAt: tx.transaction_processed_at,
      href: `/dashboard/tax/sales?tx=${encodeURIComponent(tx.id)}`,
    })
    if (byOrder.size >= limit && [...byOrder.values()].every((item) => item.amount !== null)) {
      break
    }
  }
  return [...byOrder.values()].slice(0, limit)
}

function titleFor(product: string | null, lineCount: number, isRefund: boolean): string {
  const verb = isRefund ? "Refund" : "New order"
  if (!product) {
    return verb
  }
  const extra = lineCount > 1 ? ` +${lineCount - 1} more` : ""
  return `${verb}: ${product}${extra}`
}

/** "2h ago", "Yesterday", "Aug 31" for the activity feed. */
export function relativeTime(iso: string, now: DateTime = DateTime.utc()): string {
  const then = DateTime.fromISO(iso, { zone: "utc" })
  if (!then.isValid) {
    return ""
  }
  const minutes = Math.max(0, Math.round(now.diff(then, "minutes").minutes))
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.round(hours / 24)
  if (days === 1) {
    return "Yesterday"
  }
  if (days < 7) {
    return `${days} days ago`
  }
  return then.toFormat("LLL d")
}

// ---------------------------------------------------------------------------
// Things that need the merchant's attention
// ---------------------------------------------------------------------------

export interface AttentionItem {
  key: string
  /** Sorted ascending; null sorts last. */
  dueOn: string | null
  tone: "urgent" | "soon" | "info"
  title: string
  detail: string
  href: string
  action: string
}

/**
 * The tax rows for the attention list: at most one filing and one threshold,
 * so tax sits among the platform's own to-dos instead of crowding them out.
 */
export function taxAttention(args: {
  filings: readonly FilingSummary[] | null
  nexus: NexusStudy | null
  today?: DateTime
}): AttentionItem[] {
  const today = args.today ?? DateTime.utc()
  const items: AttentionItem[] = []

  if (args.filings) {
    const outlook = filingOutlook(args.filings)
    const awaiting = args.filings
      .filter((filing) => filing.status === AWAITING_APPROVAL_STATUS && filing.due_on)
      .sort((a, b) => (a.due_on ?? "").localeCompare(b.due_on ?? ""))[0]
    const filing = awaiting ?? outlook.next
    if (filing) {
      const place = filing.state ? stateName(filing.state) : filing.jurisdiction_id
      const days = filing.due_on ? Math.ceil(DateTime.fromISO(filing.due_on, { zone: "utc" }).diff(today, "days").days) : null
      const dueText = filing.due_on ? `${days !== null && days < 0 ? "Was due" : "Due"} ${formatDate(filing.due_on)}` : "No due date yet"
      items.push(
        awaiting
          ? {
              key: `filing-${filing.id}`,
              dueOn: filing.due_on,
              tone: days !== null && days <= 7 ? "urgent" : "soon",
              title: `Approve your ${place} sales tax return`,
              detail: `${dueText} · ${formatUsd(filing.tax_collected)} collected. It is prepared and waiting on you.`,
              href: `/dashboard/tax/filings/${filing.id}`,
              action: "Review",
            }
          : {
              key: `filing-${filing.id}`,
              dueOn: filing.due_on,
              tone: days !== null && days <= 7 ? "urgent" : "info",
              title: `${place} sales tax return is being prepared`,
              detail: `${dueText} · ${formatUsd(filing.tax_collected)} collected so far. Nothing to do yet.`,
              href: `/dashboard/tax/filings/${filing.id}`,
              action: "View",
            }
      )
    }
  }

  if (args.nexus && args.nexus.study_status === "available") {
    const approaching = args.nexus.jurisdictions
      .filter((j) => j.status === "approaching" && j.economic)
      .sort((a, b) => (b.economic?.threshold_percent ?? 0) - (a.economic?.threshold_percent ?? 0))[0]
    if (approaching?.economic) {
      const pct = approaching.economic.threshold_percent
      items.push({
        key: `nexus-${approaching.jurisdiction_id}`,
        dueOn: null,
        tone: "info",
        title: `You are ${formatPercent(pct)} of the way to collecting sales tax in ${approaching.jurisdiction_name}`,
        detail: "Once you cross the threshold you will need to register there. We will let you know.",
        href: "/dashboard/tax/nexus",
        action: "See thresholds",
      })
    }
  }

  return items
}

/** Ascending by due date, undated items last, stable otherwise. */
export function sortAttention(items: readonly AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    if (a.dueOn === b.dueOn) {
      return 0
    }
    if (a.dueOn === null) {
      return 1
    }
    if (b.dueOn === null) {
      return -1
    }
    return a.dueOn.localeCompare(b.dueOn)
  })
}
