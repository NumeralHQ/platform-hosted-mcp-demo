/**
 * The Sales page keeps all of its state in the URL so every toggle and page
 * is a plain link: no client state, shareable, and the server re-runs the
 * Numeral calls for whatever the URL says.
 */
import { type Metric, type MonthsOption, parseMetric, parseMonths } from "./aggregate"

export const SALES_PATH = "/dashboard/tax/sales"

export interface SalesParams {
  months: MonthsOption
  metric: Metric
  /** Cursor for the transactions page currently shown (null = first page). */
  cursor: string | null
  /** Cursors of the pages before this one, oldest first, so "Newer" can walk back. */
  prev: readonly string[]
  /** Transaction id whose detail panel is open. */
  tx: string | null
}

export type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseSalesParams(searchParams: SearchParams): SalesParams {
  const prevRaw = first(searchParams.prev)
  return {
    months: parseMonths(first(searchParams.months)),
    metric: parseMetric(first(searchParams.metric)),
    cursor: first(searchParams.cursor) || null,
    prev: prevRaw ? prevRaw.split(",").filter((cursor) => cursor.length > 0) : [],
    tx: first(searchParams.tx) || null,
  }
}

/** Build a page href, omitting defaults so the canonical URL stays short. */
export function salesHref(params: SalesParams, overrides: Partial<SalesParams> = {}): string {
  const next: SalesParams = { ...params, ...overrides }
  const query = new URLSearchParams()
  if (next.months !== 12) {
    query.set("months", String(next.months))
  }
  if (next.metric !== "tax") {
    query.set("metric", next.metric)
  }
  if (next.cursor) {
    query.set("cursor", next.cursor)
  }
  if (next.prev.length > 0) {
    query.set("prev", next.prev.join(","))
  }
  if (next.tx) {
    query.set("tx", next.tx)
  }
  const text = query.toString()
  return text ? `${SALES_PATH}?${text}` : SALES_PATH
}

/** Paging helpers: the cursor chain is carried in the URL, newest last. */
export function nextPageHref(params: SalesParams, nextCursor: string): string {
  return salesHref(params, {
    cursor: nextCursor,
    prev: params.cursor ? [...params.prev, params.cursor] : params.prev,
    tx: null,
  })
}

export function newerPageHref(params: SalesParams): string {
  const prev = [...params.prev]
  const cursor = prev.pop() ?? null
  return salesHref(params, { cursor, prev, tx: null })
}
