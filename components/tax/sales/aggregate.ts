/**
 * Pure aggregation for the Sales page and its CSV exports. Both consume the
 * same `get_sales_summary` rows, so the shaping lives here once and is unit
 * tested against the recorded fixture.
 *
 * Units: every money value in and out of this module is MINOR units (cents),
 * exactly as `get_sales_summary` returns them. Formatting happens at the edge.
 */
import { BUCKET_ORDER, bucketOf, type LiabilityBucket } from "@/lib/liability"
import { formatCount, formatMinorUsd } from "@/lib/format"
import type { SalesSummaryRow } from "@/lib/numeral/schemas"
import { stateName } from "./states"

export const METRICS = ["tax", "sales", "orders"] as const
export type Metric = (typeof METRICS)[number]

export const METRIC_LABELS: Readonly<Record<Metric, string>> = {
  tax: "Tax collected",
  sales: "Net sales",
  orders: "Orders",
}

export const MONTH_OPTIONS = [12, 24] as const
export type MonthsOption = (typeof MONTH_OPTIONS)[number]

/** Row key for every non-US country, folded into one line. */
export const OUTSIDE_US_KEY = "__outside_us"
export const OUTSIDE_US_LABEL = "Outside the US"

export type BucketCells = Record<LiabilityBucket, number>

export interface MatrixRow {
  /** State code, or OUTSIDE_US_KEY. */
  key: string
  label: string
  /** Secondary label (state name, or the list of countries). */
  detail: string | null
  cells: BucketCells
  total: number
}

export interface SplitMatrix {
  rows: MatrixRow[]
  totals: MatrixRow
}

export interface MonthlyPoint extends BucketCells {
  month: string
}

export function isMetric(value: string | undefined): value is Metric {
  return value !== undefined && (METRICS as readonly string[]).includes(value)
}

export function parseMetric(value: string | undefined): Metric {
  return isMetric(value) ? value : "tax"
}

export function parseMonths(value: string | undefined): MonthsOption {
  return value === "24" ? 24 : 12
}

export function metricValue(row: SalesSummaryRow, metric: Metric): number {
  switch (metric) {
    case "tax":
      return row.tax_collected
    case "sales":
      return row.total_sales
    case "orders":
      return row.transaction_count
  }
}

export function emptyCells(): BucketCells {
  return { platform_remits: 0, merchant_remits: 0, platform_fees: 0, off_platform: 0 }
}

function sumCells(cells: BucketCells): number {
  let total = 0
  for (const bucket of BUCKET_ORDER) {
    total += cells[bucket]
  }
  return total
}

/**
 * States down, liability buckets across. Non-US rows collapse into one
 * "Outside the US" line so a handful of Italian orders do not turn a 35-row
 * table into a 40-row one. Rows sort by total, largest first.
 */
export function buildMatrix(rows: readonly SalesSummaryRow[], metric: Metric): SplitMatrix {
  const byKey = new Map<string, { cells: BucketCells; countries: Set<string> }>()
  for (const row of rows) {
    const isUs = row.country === "US" && row.state !== null && row.state !== ""
    const key = isUs ? row.state ?? "" : OUTSIDE_US_KEY
    const entry = byKey.get(key) ?? { cells: emptyCells(), countries: new Set<string>() }
    entry.cells[bucketOf(row.liability)] += metricValue(row, metric)
    if (!isUs) {
      entry.countries.add(row.country)
    }
    byKey.set(key, entry)
  }

  const matrixRows: MatrixRow[] = []
  for (const [key, entry] of byKey) {
    const outside = key === OUTSIDE_US_KEY
    matrixRows.push({
      key,
      label: outside ? OUTSIDE_US_LABEL : key,
      detail: outside ? [...entry.countries].sort().join(", ") : stateName(key),
      cells: entry.cells,
      total: sumCells(entry.cells),
    })
  }
  matrixRows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  const totalCells = emptyCells()
  for (const row of matrixRows) {
    for (const bucket of BUCKET_ORDER) {
      totalCells[bucket] += row.cells[bucket]
    }
  }
  return {
    rows: matrixRows,
    totals: { key: "__total", label: "Total", detail: null, cells: totalCells, total: sumCells(totalCells) },
  }
}

/** One point per month, each carrying the four bucket values, oldest first. */
export function buildMonthly(rows: readonly SalesSummaryRow[], metric: Metric): MonthlyPoint[] {
  const byMonth = new Map<string, BucketCells>()
  for (const row of rows) {
    const cells = byMonth.get(row.month) ?? emptyCells()
    cells[bucketOf(row.liability)] += metricValue(row, metric)
    byMonth.set(row.month, cells)
  }
  const points: MonthlyPoint[] = []
  for (const [month, cells] of byMonth) {
    points.push({ month, ...cells })
  }
  points.sort((a, b) => a.month.localeCompare(b.month))
  return points
}

/** Display formatting for a metric value (minor units for money). */
export function formatMetric(value: number, metric: Metric, options: { compact?: boolean } = {}): string {
  if (metric === "orders") {
    return formatCount(value)
  }
  return options.compact ? formatMinorUsd(value, { compact: true, cents: false }) : formatMinorUsd(value)
}

export function trendTitle(metric: Metric): string {
  return `${METRIC_LABELS[metric]} by month`
}

/** CSV cell for a metric value: dollars with two decimals, or a count. */
export function csvMetric(value: number, metric: Metric): string {
  return metric === "orders" ? String(value) : (value / 100).toFixed(2)
}

/** Where a set of tool calls got their data, for the CSV provenance header. */
export function provenanceOf(traces: readonly { source: "live" | "fixture" }[]): "live" | "fixture" | "mixed" {
  let live = 0
  let fixture = 0
  for (const trace of traces) {
    if (trace.source === "live") {
      live += 1
    } else {
      fixture += 1
    }
  }
  if (live > 0 && fixture === 0) {
    return "live"
  }
  if (fixture > 0 && live === 0) {
    return "fixture"
  }
  return "mixed"
}

/** Friendly copy for the Numeral error codes a sales panel can hit. */
export function describeError(code: string | null, fallback: string): string {
  switch (code) {
    case "merchant_not_found":
      return "Numeral has no record of this merchant yet. Sales appear once the first order is recorded."
    case "invalid_date_range":
      return "The selected date range is not valid. Sales summaries cover at most 24 months."
    case "transaction_not_found":
      return "That transaction is no longer available."
    case "unexpected_shape":
      return "Numeral returned data in a shape this page does not recognize."
    default:
      return fallback
  }
}
