import type { FilingSummary } from "@/lib/numeral/schemas"
import { isFilingStatus, type FilingStatusLiteral } from "./filing-status"

/**
 * The three filters the Filings tab accepts from the URL, validated before
 * anything reaches the MCP. `status` and `state` go to `list_filings`; `year`
 * is applied here because the tool takes due-date bounds, not period bounds.
 * The page and the CSV export share this so the download matches the screen.
 */
export interface FilingFilters {
  status: FilingStatusLiteral | null
  year: number | null
  /** Two-letter state code, upper case. */
  state: string | null
}

export type SearchParamsInput = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseFilingFilters(params: SearchParamsInput): FilingFilters {
  const status = first(params.status)
  const year = first(params.year)
  const state = first(params.state)?.toUpperCase()
  return {
    status: status && isFilingStatus(status) ? status : null,
    year: year && /^\d{4}$/.test(year) ? Number(year) : null,
    state: state && /^[A-Z]{2}$/.test(state) ? state : null,
  }
}

export function filingFiltersToSearch(filters: Partial<FilingFilters>): string {
  const search = new URLSearchParams()
  if (filters.status) {
    search.set("status", filters.status)
  }
  if (filters.year) {
    search.set("year", String(filters.year))
  }
  if (filters.state) {
    search.set("state", filters.state)
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}

export function jurisdictionIdFor(state: string): string {
  return `US-${state}`
}

/**
 * Re-applies every filter on the returned rows. Live `list_filings` already
 * honors status and jurisdiction; in replay mode the recorded response is
 * unfiltered, and the year filter is always ours.
 */
export function applyFilingFilters(
  filings: readonly FilingSummary[],
  filters: FilingFilters
): FilingSummary[] {
  return filings.filter((filing) => {
    if (filters.status && filing.status !== filters.status) {
      return false
    }
    if (filters.state && filing.jurisdiction_id !== jurisdictionIdFor(filters.state)) {
      return false
    }
    if (filters.year && filing.period_starts_at?.slice(0, 4) !== String(filters.year)) {
      return false
    }
    return true
  })
}
