import { DateTime } from "luxon"

/**
 * Money helpers. Be explicit about units at every call site: the Numeral MCP
 * returns sales-summary, nexus, and transaction amounts in MINOR units and
 * filing amounts in dollars.
 */
export function fromMinor(minor: number | null | undefined): number {
  return (minor ?? 0) / 100
}

export function formatUsd(dollars: number, options: { compact?: boolean; cents?: boolean } = {}): string {
  if (options.compact && Math.abs(dollars) >= 10_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(dollars)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.cents === false ? 0 : 2,
    maximumFractionDigits: options.cents === false ? 0 : 2,
  }).format(dollars)
}

export function formatMinorUsd(minor: number | null | undefined, options?: { compact?: boolean; cents?: boolean }): string {
  return formatUsd(fromMinor(minor), options)
}

export function formatCount(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(n ?? 0)
}

export function formatPercent(pct: number | null | undefined, digits = 0): string {
  return `${(pct ?? 0).toFixed(digits)}%`
}

export function formatDate(iso: string | null | undefined, format = "LLL d, yyyy"): string {
  if (!iso) {
    return "—"
  }
  const dt = DateTime.fromISO(iso, { zone: "utc" })
  return dt.isValid ? dt.toFormat(format) : iso
}

export function formatMonth(yyyyMm: string): string {
  const dt = DateTime.fromISO(`${yyyyMm}-01`, { zone: "utc" })
  return dt.isValid ? dt.toFormat("LLL yyyy") : yyyyMm
}

/** "Q3 2026" or "Aug 2026" from a filing period. */
export function formatPeriod(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) {
    return "—"
  }
  const start = DateTime.fromISO(startIso, { zone: "utc" })
  const end = DateTime.fromISO(endIso, { zone: "utc" })
  if (!start.isValid || !end.isValid) {
    return `${startIso} – ${endIso}`
  }
  const months = Math.round(end.plus({ days: 1 }).diff(start, "months").months)
  if (months === 1) {
    return start.toFormat("LLL yyyy")
  }
  if (months === 3) {
    return `Q${start.quarter} ${start.year}`
  }
  if (months === 12) {
    return `${start.year}`
  }
  return `${start.toFormat("LLL d")} – ${end.toFormat("LLL d, yyyy")}`
}

export function daysUntil(iso: string | null | undefined, today = DateTime.utc()): number | null {
  if (!iso) {
    return null
  }
  const dt = DateTime.fromISO(iso, { zone: "utc" })
  return dt.isValid ? Math.ceil(dt.diff(today.startOf("day"), "days").days) : null
}

export function humanize(literal: string | null | undefined): string {
  if (!literal) {
    return "—"
  }
  return literal.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
