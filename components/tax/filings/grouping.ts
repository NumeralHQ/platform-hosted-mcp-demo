import { DateTime } from "luxon"
import type { FilingSummary } from "@/lib/numeral"
import { daysUntil } from "@/lib/format"
import { FILING_BUCKET_ORDER, filingBucket, type FilingBucket } from "./filing-status"

export interface FilingGroup {
  bucket: FilingBucket
  filings: FilingSummary[]
}

function byDueAsc(a: FilingSummary, b: FilingSummary): number {
  return (a.due_on ?? "").localeCompare(b.due_on ?? "")
}

/** Due soon and needs attention: soonest first. Filed and canceled: newest first. */
export function groupFilings(filings: readonly FilingSummary[]): FilingGroup[] {
  const groups = new Map<FilingBucket, FilingSummary[]>()
  for (const filing of filings) {
    const bucket = filingBucket(filing.status)
    const list = groups.get(bucket) ?? []
    list.push(filing)
    groups.set(bucket, list)
  }
  const result: FilingGroup[] = []
  for (const bucket of FILING_BUCKET_ORDER) {
    const list = groups.get(bucket)
    if (!list || list.length === 0) {
      continue
    }
    const sorted = [...list].sort(byDueAsc)
    if (bucket === "filed" || bucket === "canceled") {
      sorted.reverse()
    }
    result.push({ bucket, filings: sorted })
  }
  return result
}

export function countByBucket(filings: readonly FilingSummary[]): Record<FilingBucket, number> {
  const counts: Record<FilingBucket, number> = { due_soon: 0, needs_attention: 0, filed: 0, canceled: 0 }
  for (const filing of filings) {
    counts[filingBucket(filing.status)] += 1
  }
  return counts
}

export interface NextDue {
  filing: FilingSummary
  daysUntil: number | null
}

/** The unfiled return with the nearest due date, overdue ones first. */
export function nextDue(filings: readonly FilingSummary[], today = DateTime.utc()): NextDue | null {
  const candidates = filings
    .filter((filing) => filingBucket(filing.status) !== "filed" && filingBucket(filing.status) !== "canceled")
    .filter((filing) => filing.due_on)
    .sort(byDueAsc)
  const filing = candidates[0]
  if (!filing) {
    return null
  }
  return { filing, daysUntil: daysUntil(filing.due_on, today) }
}

export function dueLabel(days: number | null): string {
  if (days === null) {
    return ""
  }
  if (days < 0) {
    return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`
  }
  if (days === 0) {
    return "due today"
  }
  return `in ${days} ${days === 1 ? "day" : "days"}`
}
