import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { DateTime } from "luxon"
import { FILING_STATUSES, getFilingSchema, listFilingsSchema, salesSummarySchema } from "@/lib/numeral/schemas"
import { filingBucket, filingStatusLabel } from "../filing-status"
import { applyFilingFilters, filingFiltersToSearch, parseFilingFilters } from "../filters"
import { countByBucket, dueLabel, groupFilings, nextDue } from "../grouping"
import { aggregatePeriodSales } from "../period-sales-card"

const FIXTURES = path.resolve(__dirname, "../../../../fixtures/ridgeline-linked")

function fixture(name: string): unknown {
  const raw = JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as { isError: boolean; data: unknown }
  expect(raw.isError).toBe(false)
  return raw.data
}

describe("filing status map", () => {
  test("every literal has a plain-language label", () => {
    for (const status of FILING_STATUSES) {
      const label = filingStatusLabel(status)
      expect(label).not.toContain("_")
      expect(label.length).toBeGreaterThan(0)
    }
    expect(filingStatusLabel("something_new")).toBe("In progress")
  })

  test("buckets", () => {
    expect(filingBucket("filed")).toBe("filed")
    expect(filingBucket("canceled")).toBe("canceled")
    for (const status of ["has_problems", "client_rejected", "admin_rejected"]) {
      expect(filingBucket(status)).toBe("needs_attention")
    }
    for (const status of ["unfiled", "in_progress", "pending_client_approval", "pending_admin_approval", "client_approved", "pending_payment", "transmitting", "pending_ack", "pending_payment_ack", "pni_portal_review", "on_hold"]) {
      expect(filingBucket(status)).toBe("due_soon")
    }
    expect(filingBucket("something_new")).toBe("due_soon")
  })
})

describe("filters", () => {
  test("rejects anything that is not a known literal, a year, or a state code", () => {
    expect(parseFilingFilters({ status: "registered", year: "20x6", state: "california" })).toEqual({
      status: null,
      year: null,
      state: null,
    })
    expect(parseFilingFilters({ status: "filed", year: "2026", state: "ca" })).toEqual({
      status: "filed",
      year: 2026,
      state: "CA",
    })
    expect(parseFilingFilters({ status: ["in_progress", "filed"] })).toMatchObject({ status: "in_progress" })
  })

  test("round-trips to a query string", () => {
    expect(filingFiltersToSearch({ status: "filed", year: 2026, state: "CA" })).toBe("?status=filed&year=2026&state=CA")
    expect(filingFiltersToSearch({ status: null, year: null, state: null })).toBe("")
  })
})

describe("with the Ridgeline fixtures", () => {
  const filings = listFilingsSchema.parse(fixture("list_filings.json")).filings
  const parsedToday = DateTime.fromISO("2026-09-17", { zone: "utc" })
  if (!parsedToday.isValid) {
    throw new Error("bad test date")
  }
  const today = parsedToday

  test("26 returns: 21 filed, 5 due soon, none needing attention", () => {
    expect(filings).toHaveLength(26)
    expect(countByBucket(filings)).toEqual({ due_soon: 5, needs_attention: 0, filed: 21, canceled: 0 })
  })

  test("groups sort due soon ascending and filed descending", () => {
    const groups = groupFilings(filings)
    expect(groups.map((g) => g.bucket)).toEqual(["due_soon", "filed"])
    const dueSoon = groups[0]?.filings.map((f) => f.due_on) ?? []
    expect(dueSoon).toEqual([...dueSoon].sort())
    const filed = groups[1]?.filings.map((f) => f.due_on) ?? []
    expect(filed).toEqual([...filed].sort().reverse())
  })

  test("next due is Illinois August 2026 in 3 days", () => {
    const next = nextDue(filings, today)
    expect(next?.filing.id).toBe("70013")
    expect(next?.filing.state).toBe("IL")
    expect(next?.daysUntil).toBe(3)
    expect(dueLabel(next?.daysUntil ?? null)).toBe("in 3 days")
    expect(dueLabel(-2)).toBe("2 days overdue")
    expect(dueLabel(0)).toBe("due today")
  })

  test("filters narrow the visible rows", () => {
    expect(applyFilingFilters(filings, { status: null, year: 2025, state: null })).toHaveLength(9)
    expect(applyFilingFilters(filings, { status: "filed", year: null, state: "CA" })).toHaveLength(7)
    expect(applyFilingFilters(filings, { status: "pending_client_approval", year: null, state: null }).map((f) => f.id)).toEqual(["70013"])
  })

  test("the late California quarter carries penalty and interest", () => {
    const detail = getFilingSchema.parse(fixture("get_filing.70004.json")).filing
    expect(detail.penalty_amount).toBeCloseTo(440.18)
    expect(detail.interest_amount).toBeCloseTo(220.09)
    expect(detail.tax_collected + detail.penalty_amount + detail.interest_amount).toBeCloseTo(5071.23)
    expect((detail.filed_at ?? "") > (detail.due_on ?? "")).toBe(true)
  })

  test("period sales aggregate only the filing's months and state", () => {
    const detail = getFilingSchema.parse(fixture("get_filing.70004.json")).filing
    const summary = salesSummarySchema.parse(fixture("get_sales_summary.json"))
    const rows = aggregatePeriodSales(summary, detail)
    expect(rows.length).toBeGreaterThan(0)
    const expected = summary.rows.filter((r) => r.state === "CA" && r.month >= "2025-10" && r.month <= "2025-12")
    const total = rows.reduce((sum, r) => sum + r.totalSales, 0)
    expect(total).toBe(expected.reduce((sum, r) => sum + r.total_sales, 0))
  })
})
