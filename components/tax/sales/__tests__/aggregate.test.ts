import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { BUCKET_ORDER } from "@/lib/liability"
import { salesSummarySchema, type SalesSummaryRow } from "@/lib/numeral/schemas"
import {
  OUTSIDE_US_KEY,
  buildMatrix,
  buildMonthly,
  csvMetric,
  formatMetric,
  parseMetric,
  parseMonths,
  provenanceOf,
} from "../aggregate"
import { newerPageHref, nextPageHref, parseSalesParams, salesHref } from "../url"

const FIXTURE = path.resolve(__dirname, "../../../../fixtures/ridgeline-linked/get_sales_summary.json")

function fixtureRows(): SalesSummaryRow[] {
  const raw = JSON.parse(readFileSync(FIXTURE, "utf8")) as { data: unknown }
  return salesSummarySchema.parse(raw.data).rows
}

describe("buildMatrix", () => {
  const rows = fixtureRows()

  test("groups US states by code and folds other countries into one row", () => {
    const matrix = buildMatrix(rows, "tax")
    const outside = matrix.rows.find((row) => row.key === OUTSIDE_US_KEY)
    expect(outside?.detail).toBe("IT")
    expect(matrix.rows.filter((row) => row.key === OUTSIDE_US_KEY)).toHaveLength(1)
    for (const row of matrix.rows) {
      if (row.key !== OUTSIDE_US_KEY) {
        expect(row.key).toMatch(/^[A-Z]{2}$/)
      }
    }
  })

  test("Milan (IT/MI) never merges into Michigan (US/MI)", () => {
    const rows: SalesSummaryRow[] = [
      { month: "2026-01", country: "US", state: "MI", currency: "USD", liability: "merchant_responsible", transaction_count: 1, total_sales: 1000, tax_collected: 60 },
      { month: "2026-01", country: "IT", state: "MI", currency: "USD", liability: "marketplace_facilitated", transaction_count: 2, total_sales: 5000, tax_collected: 1100 },
      { month: "2026-01", country: "DE", state: null, currency: "USD", liability: "marketplace_facilitated", transaction_count: 1, total_sales: 700, tax_collected: 133 },
    ]
    const matrix = buildMatrix(rows, "tax")
    const michigan = matrix.rows.find((row) => row.key === "MI")
    const outside = matrix.rows.find((row) => row.key === OUTSIDE_US_KEY)
    expect(michigan?.total).toBe(60)
    expect(michigan?.detail).toBe("Michigan")
    expect(outside?.total).toBe(1233)
    expect(outside?.detail).toBe("DE, IT")
    expect(matrix.rows).toHaveLength(2)
  })

  test("sorts by total descending and totals reconcile", () => {
    const matrix = buildMatrix(rows, "sales")
    for (let index = 1; index < matrix.rows.length; index += 1) {
      expect(matrix.rows[index - 1]!.total).toBeGreaterThanOrEqual(matrix.rows[index]!.total)
    }
    let expected = 0
    for (const row of rows) {
      expected += row.total_sales
    }
    expect(matrix.totals.total).toBe(expected)
    let bucketSum = 0
    for (const bucket of BUCKET_ORDER) {
      bucketSum += matrix.totals.cells[bucket]
    }
    expect(bucketSum).toBe(expected)
  })

  test("orders metric counts transactions", () => {
    const matrix = buildMatrix(rows, "orders")
    let expected = 0
    for (const row of rows) {
      expected += row.transaction_count
    }
    expect(matrix.totals.total).toBe(expected)
  })
})

describe("buildMonthly", () => {
  test("returns one point per month, oldest first, with all four buckets", () => {
    const points = buildMonthly(fixtureRows(), "tax")
    expect(points).toHaveLength(12)
    expect(points[0]?.month).toBe("2025-09")
    expect(points[11]?.month).toBe("2026-08")
    for (const bucket of BUCKET_ORDER) {
      expect(typeof points[0]?.[bucket]).toBe("number")
    }
  })
})

describe("formatting", () => {
  test("money metrics are minor units; orders are counts", () => {
    expect(formatMetric(123456, "tax")).toBe("$1,234.56")
    expect(formatMetric(1234, "orders")).toBe("1,234")
    expect(csvMetric(123456, "sales")).toBe("1234.56")
    expect(csvMetric(7, "orders")).toBe("7")
  })

  test("params fall back to defaults", () => {
    expect(parseMetric(undefined)).toBe("tax")
    expect(parseMetric("bogus")).toBe("tax")
    expect(parseMetric("orders")).toBe("orders")
    expect(parseMonths("24")).toBe(24)
    expect(parseMonths("36")).toBe(12)
  })
})

describe("provenanceOf", () => {
  test("live, fixture, or mixed", () => {
    expect(provenanceOf([{ source: "live" }, { source: "live" }])).toBe("live")
    expect(provenanceOf([{ source: "fixture" }])).toBe("fixture")
    expect(provenanceOf([{ source: "live" }, { source: "fixture" }])).toBe("mixed")
    expect(provenanceOf([])).toBe("mixed")
  })
})

describe("url state", () => {
  test("defaults produce the bare path and non-defaults round-trip", () => {
    const params = parseSalesParams({})
    expect(salesHref(params)).toBe("/dashboard/tax/sales")
    const href = salesHref(params, { months: 24, metric: "orders", tx: "tr_1" })
    expect(href).toBe("/dashboard/tax/sales?months=24&metric=orders&tx=tr_1")
  })

  test("paging pushes and pops the cursor chain", () => {
    const first = parseSalesParams({})
    const second = nextPageHref(first, "c2")
    expect(second).toBe("/dashboard/tax/sales?cursor=c2")
    const secondParams = parseSalesParams({ cursor: "c2" })
    const third = nextPageHref(secondParams, "c3")
    expect(third).toBe("/dashboard/tax/sales?cursor=c3&prev=c2")
    const thirdParams = parseSalesParams({ cursor: "c3", prev: "c2" })
    expect(newerPageHref(thirdParams)).toBe("/dashboard/tax/sales?cursor=c2")
    expect(newerPageHref(secondParams)).toBe("/dashboard/tax/sales")
  })
})
