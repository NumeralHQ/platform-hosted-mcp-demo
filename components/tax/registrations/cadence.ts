import { DateTime } from "luxon"
import type { FilingSummary } from "@/lib/numeral/schemas"

/**
 * The MCP does not expose filing frequency on a registration yet, so the
 * Registrations table infers it from the period spans of the merchant's
 * recent returns in that jurisdiction. Labelled "based on recent returns"
 * in the UI so nobody mistakes it for the state's assigned frequency.
 */
export type FilingCadence = "Monthly" | "Quarterly" | "Annual"

const RECENT_RETURNS = 4

function periodMonths(filing: FilingSummary): number | null {
  if (!filing.period_starts_at || !filing.period_ends_at) {
    return null
  }
  const start = DateTime.fromISO(filing.period_starts_at, { zone: "utc" })
  const end = DateTime.fromISO(filing.period_ends_at, { zone: "utc" })
  if (!start.isValid || !end.isValid) {
    return null
  }
  return Math.round(end.plus({ days: 1 }).diff(start, "months").months)
}

function cadenceOf(months: number): FilingCadence | null {
  switch (months) {
    case 1:
      return "Monthly"
    case 3:
      return "Quarterly"
    case 12:
      return "Annual"
    default:
      return null
  }
}

/** jurisdiction_id → cadence, from the most recent returns per jurisdiction. */
export function inferCadence(filings: readonly FilingSummary[]): Map<string, FilingCadence> {
  const byJurisdiction = new Map<string, FilingSummary[]>()
  for (const filing of filings) {
    const list = byJurisdiction.get(filing.jurisdiction_id) ?? []
    list.push(filing)
    byJurisdiction.set(filing.jurisdiction_id, list)
  }

  const result = new Map<string, FilingCadence>()
  for (const [jurisdictionId, list] of byJurisdiction) {
    const recent = [...list]
      .sort((a, b) => (b.period_starts_at ?? "").localeCompare(a.period_starts_at ?? ""))
      .slice(0, RECENT_RETURNS)
    const votes = new Map<FilingCadence, number>()
    for (const filing of recent) {
      const months = periodMonths(filing)
      const cadence = months === null ? null : cadenceOf(months)
      if (cadence) {
        votes.set(cadence, (votes.get(cadence) ?? 0) + 1)
      }
    }
    let winner: FilingCadence | null = null
    let best = 0
    for (const [cadence, count] of votes) {
      if (count > best) {
        winner = cadence
        best = count
      }
    }
    if (winner) {
      result.set(jurisdictionId, winner)
    }
  }
  return result
}
