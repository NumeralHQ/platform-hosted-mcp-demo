import { DateTime } from "luxon"
import { formatDate, formatMinorUsd, humanize } from "@/lib/format"
import type { ListRegistrations, NexusJurisdiction, NexusStudy } from "@/lib/numeral"

/**
 * The view model behind every panel on the Nexus page and the CSV export.
 * Pure functions over the study and the registrations list, so the page,
 * the route handler and the tests all shape a row the same way.
 */

export type MapStatus = NexusJurisdiction["status"]

export const STATUS_LABELS: Readonly<Record<MapStatus, string>> = {
  has_nexus: "Has nexus",
  approaching: "Approaching",
  safe: "Below threshold",
}

export const SOURCE_LABELS: Readonly<Record<NonNullable<NexusJurisdiction["nexus_source"]>, string>> = {
  economic: "Economic",
  physical: "Physical",
  both: "Physical and economic",
}

export function sourceLabel(source: NexusJurisdiction["nexus_source"]): string {
  return source ? SOURCE_LABELS[source] : "—"
}

/**
 * The `period_type` literals the study uses, in plain words. Anything not
 * listed falls back to humanizing the literal so a new rule still renders.
 */
export const PERIOD_LABELS: Readonly<Record<string, string>> = {
  current_or_previous: "current or previous calendar year",
  previous: "previous calendar year",
  current: "current calendar year",
  rolling_365_days: "trailing 12 months",
  rolling_12_months: "trailing 12 months",
  prev_12_months_from_quarter_starts: "trailing 12 months, checked at each quarter start",
  new_york: "previous four sales-tax quarters",
}

export function periodLabel(periodType: string): string {
  return PERIOD_LABELS[periodType] ?? humanize(periodType).toLowerCase()
}

type NexusRule = NonNullable<NonNullable<NexusJurisdiction["economic"]>["rule"]>

/** "$100,000 or 200 transactions, current or previous calendar year" */
export function ruleInWords(rule: NexusRule | null | undefined): string {
  if (!rule) {
    return "No economic-nexus rule on file"
  }
  const legs: string[] = []
  if (rule.sales_threshold !== null) {
    legs.push(formatMinorUsd(rule.sales_threshold, { cents: false }))
  }
  if (rule.volume_threshold !== null) {
    legs.push(`${new Intl.NumberFormat("en-US").format(rule.volume_threshold)} transactions`)
  }
  if (legs.length === 0) {
    return `No sales threshold, ${periodLabel(rule.period_type)}`
  }
  const joiner = rule.conjunction === "and" ? " and " : " or "
  return `${legs.join(joiner)}, ${periodLabel(rule.period_type)}`
}

// ---------------------------------------------------------------------------
// Registrations join
// ---------------------------------------------------------------------------

export type RegistrationState = "registered" | "in_progress" | "none" | "unknown"

const REGISTERED_STATUSES: ReadonlySet<string> = new Set([
  "online_account_created",
  "fully_transferred",
  "complete",
  "ready_to_file",
])

const IN_PROGRESS_STATUSES: ReadonlySet<string> = new Set([
  "onboarding",
  "in_progress",
  "ops_review",
  "waiting_for_mail",
  "documents_received",
  "incomplete",
  "pending_2fa",
])

export function registrationStateOf(status: string | null | undefined): RegistrationState {
  if (!status) {
    return "none"
  }
  if (REGISTERED_STATUSES.has(status)) {
    return "registered"
  }
  if (IN_PROGRESS_STATUSES.has(status)) {
    return "in_progress"
  }
  return "none"
}

export const REGISTRATION_LABELS: Readonly<Record<RegistrationState, string>> = {
  registered: "Registered",
  in_progress: "Registration in progress",
  none: "Not registered",
  unknown: "Unavailable",
}

export interface RegistrationInfo {
  state: RegistrationState
  /** The raw Numeral status, humanized, e.g. "Waiting for mail". */
  detail: string | null
  accountNumber: string | null
  startDate: string | null
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface JurisdictionRow {
  jurisdictionId: string
  /** USPS code for US rows, null for the rest of the world. */
  stateCode: string | null
  name: string
  status: MapStatus
  source: NexusJurisdiction["nexus_source"]
  /** Real percent from the study, uncapped. */
  thresholdPercent: number | null
  rule: string
  /** null when there is no economic rule (non-US rows). */
  marketplaceCounts: boolean | null
  collectionStart: string | null
  registration: RegistrationInfo
  jurisdiction: NexusJurisdiction
}

export function isUsJurisdiction(jurisdictionId: string): boolean {
  return jurisdictionId.startsWith("US-")
}

function registrationFor(
  jurisdictionId: string,
  registrations: ListRegistrations | null
): RegistrationInfo {
  if (registrations === null) {
    return { state: "unknown", detail: null, accountNumber: null, startDate: null }
  }
  const matches = registrations.registrations.filter(
    (registration) => registration.jurisdiction_id === jurisdictionId && !registration.deregistered_on
  )
  if (matches.length === 0) {
    return { state: "none", detail: null, accountNumber: null, startDate: null }
  }
  // Prefer a registered row over one still onboarding when both exist.
  const best =
    matches.find((registration) => registrationStateOf(registration.status) === "registered") ?? matches[0]
  if (!best) {
    return { state: "none", detail: null, accountNumber: null, startDate: null }
  }
  return {
    state: registrationStateOf(best.status),
    detail: best.status ? humanize(best.status) : null,
    accountNumber: best.account_number,
    startDate: best.start_date_on,
  }
}

export function buildRows(args: {
  study: NexusStudy
  /** Pass null when the registrations call failed; rows read "Unavailable". */
  registrations: ListRegistrations | null
}): JurisdictionRow[] {
  const rows: JurisdictionRow[] = []
  for (const jurisdiction of args.study.jurisdictions) {
    rows.push({
      jurisdictionId: jurisdiction.jurisdiction_id,
      stateCode: isUsJurisdiction(jurisdiction.jurisdiction_id) ? jurisdiction.state_code : null,
      name: jurisdiction.jurisdiction_name,
      status: jurisdiction.status,
      source: jurisdiction.nexus_source,
      thresholdPercent: jurisdiction.economic?.threshold_percent ?? null,
      rule: ruleInWords(jurisdiction.economic?.rule),
      marketplaceCounts: jurisdiction.economic?.rule?.marketplace_sales_count_toward_threshold ?? null,
      collectionStart: jurisdiction.collection_start_date,
      registration: registrationFor(jurisdiction.jurisdiction_id, args.registrations),
      jurisdiction,
    })
  }
  return rows
}

const STATUS_RANK: Readonly<Record<MapStatus, number>> = { has_nexus: 0, approaching: 1, safe: 2 }

/**
 * has_nexus first, by collection start (earliest first, unknown last); then
 * approaching and safe, each by threshold percent descending.
 */
export function sortRows(rows: readonly JurisdictionRow[]): JurisdictionRow[] {
  return [...rows].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (rank !== 0) {
      return rank
    }
    if (a.status === "has_nexus") {
      const aStart = a.collectionStart ?? "9999-12-31"
      const bStart = b.collectionStart ?? "9999-12-31"
      if (aStart !== bStart) {
        return aStart.localeCompare(bStart)
      }
    }
    const pct = (b.thresholdPercent ?? -1) - (a.thresholdPercent ?? -1)
    return pct !== 0 ? pct : a.name.localeCompare(b.name)
  })
}

export function usRows(rows: readonly JurisdictionRow[]): JurisdictionRow[] {
  return rows.filter((row) => row.stateCode !== null)
}

export function outsideUsRows(rows: readonly JurisdictionRow[]): JurisdictionRow[] {
  return rows.filter((row) => !isUsJurisdiction(row.jurisdictionId))
}

export interface StatusCounts {
  has_nexus: number
  approaching: number
  safe: number
}

export function statusCounts(rows: readonly JurisdictionRow[]): StatusCounts {
  const counts: StatusCounts = { has_nexus: 0, approaching: 0, safe: 0 }
  for (const row of rows) {
    counts[row.status] += 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Map props (plain, serializable)
// ---------------------------------------------------------------------------

export interface MapState {
  stateCode: string
  name: string
  status: MapStatus
  registered: boolean
  thresholdPercent: number | null
  marketplaceCounts: boolean | null
  collectionStart: string | null
}

export function mapStates(rows: readonly JurisdictionRow[]): MapState[] {
  const states: MapState[] = []
  for (const row of usRows(rows)) {
    if (row.stateCode === null) {
      continue
    }
    states.push({
      stateCode: row.stateCode,
      name: row.name,
      status: row.status,
      registered: row.registration.state === "registered",
      thresholdPercent: row.thresholdPercent,
      marketplaceCounts: row.marketplaceCounts,
      collectionStart: row.collectionStart,
    })
  }
  return states
}

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

/** "incorporation_state" -> "Incorporation state"; "owned_or_leased_property" -> "Owned or leased property". */
export function humanizePresence(literal: string): string {
  return humanize(literal)
}

export function formatPercentReal(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) {
    return "—"
  }
  const digits = Number.isInteger(pct) ? 0 : 1
  return `${pct.toFixed(digits)}%`
}

export function formatWindow(start: string | null, end: string | null): string {
  if (!start || !end) {
    return "—"
  }
  const s = DateTime.fromISO(start, { zone: "utc" })
  const e = DateTime.fromISO(end, { zone: "utc" })
  if (!s.isValid || !e.isValid) {
    return `${start} – ${end}`
  }
  return s.year === e.year
    ? `${s.toFormat("LLL d")} – ${e.toFormat("LLL d, yyyy")}`
    : `${formatDate(start)} – ${formatDate(end)}`
}

/** CSV/export shape for one row: strings only, no cents. */
export function exportRecord(row: JurisdictionRow): Record<string, string> {
  return {
    jurisdiction: row.stateCode ?? row.jurisdictionId,
    name: row.name,
    status: STATUS_LABELS[row.status],
    source: sourceLabel(row.source),
    threshold_percent: row.thresholdPercent === null ? "" : String(row.thresholdPercent),
    rule: row.rule,
    marketplace_sales_count: row.marketplaceCounts === null ? "" : row.marketplaceCounts ? "Yes" : "No",
    collection_start: row.collectionStart ?? "",
    registration: REGISTRATION_LABELS[row.registration.state],
  }
}
