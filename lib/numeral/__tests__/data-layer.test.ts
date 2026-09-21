import { describe, expect, test } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { bucketOf } from "@/lib/liability"
import { formatPeriod, fromMinor } from "@/lib/format"
import { fixtureKey } from "../data-source"
import {
  getFilingSchema,
  getMerchantSchema,
  getTransactionSchema,
  listFilingsSchema,
  listMerchantsSchema,
  listRegistrationsSchema,
  listTransactionsSchema,
  nexusStudySchema,
  salesSummarySchema,
} from "../schemas"

const FIXTURES = path.resolve(__dirname, "../../../fixtures/ridgeline-linked")

function fixture(name: string): unknown {
  const raw = JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as { isError: boolean; data: unknown }
  expect(raw.isError).toBe(false)
  return raw.data
}

describe("recorded fixtures parse with the tool schemas", () => {
  test("merchants", () => {
    const list = listMerchantsSchema.parse(fixture("list_merchants.json"))
    expect(list.merchants[0]?.reference_merchant_id).toBe("ridgeline-trading")
    expect(list.merchants[0]?.email).toBe("merchant@example.com")
    const one = getMerchantSchema.parse(fixture("get_merchant.json"))
    expect(one.merchant.linked).toBe(true)
  })

  test("sales summary rows are minor-unit strings that become numbers", () => {
    const summary = salesSummarySchema.parse(fixture("get_sales_summary.json"))
    expect(summary.rows.length).toBeGreaterThan(100)
    const row = summary.rows[0]
    expect(typeof row?.total_sales).toBe("number")
    const buckets = new Set(summary.rows.map((r) => bucketOf(r.liability)))
    expect(buckets.has("platform_remits")).toBe(true)
    expect(buckets.has("merchant_remits")).toBe(true)
    expect(buckets.has("platform_fees")).toBe(true)
    // $190.00 in Italy in the first row of the recording.
    expect(fromMinor(row?.total_sales)).toBeGreaterThan(0)
  })

  test("transactions", () => {
    const list = listTransactionsSchema.parse(fixture("list_transactions.json"))
    expect(list.transactions).toHaveLength(25)
    expect(list.has_more).toBe(true)
    const detail = getTransactionSchema.parse(fixture("get_transaction.json"))
    expect(detail.transaction.line_items.length).toBeGreaterThan(0)
    expect(detail.transaction.line_items[0]?.product.product_tax_code).toBeTruthy()
  })

  test("nexus study carries the marketplace-inclusion rule per state", () => {
    const study = nexusStudySchema.parse(fixture("get_nexus_study.json"))
    expect(study.scope).toBe("merchant_account")
    expect(study.study_status).toBe("available")
    const il = study.jurisdictions.find((j) => j.jurisdiction_id === "US-IL")
    const wa = study.jurisdictions.find((j) => j.jurisdiction_id === "US-WA")
    expect(il?.economic?.rule?.marketplace_sales_count_toward_threshold).toBe(false)
    expect(wa?.economic?.rule?.marketplace_sales_count_toward_threshold).toBe(true)
    expect(il?.status).toBe("has_nexus")
    // Minor units: Illinois's $100k threshold is 10,000,000.
    expect(il?.economic?.rule?.sales_threshold).toBe(10_000_000)
  })

  test("filings are dollars and periods label as months or quarters", () => {
    const list = listFilingsSchema.parse(fixture("list_filings.json"))
    expect(list.filings).toHaveLength(26)
    const pending = list.filings.filter((f) => f.status === "pending_client_approval")
    expect(pending).toHaveLength(1)
    expect(formatPeriod(pending[0]?.period_starts_at ?? null, pending[0]?.period_ends_at ?? null)).toBe("Aug 2026")
    const ca = list.filings.find((f) => f.jurisdiction_id === "US-CA")
    expect(formatPeriod(ca?.period_starts_at ?? null, ca?.period_ends_at ?? null)).toMatch(/^Q\d 20\d\d$/)
    expect(ca?.taxable_sales).toBeGreaterThan(1_000)
    expect(ca?.taxable_sales).toBeLessThan(100_000)
  })

  test("every filing detail fixture parses", () => {
    const details = readdirSync(FIXTURES).filter((f) => /^get_filing\.\d+\.json$/.test(f))
    expect(details).toHaveLength(26)
    for (const file of details) {
      const detail = getFilingSchema.parse(fixture(file))
      expect(detail.filing.calculated_sales_data).toBeTruthy()
    }
  })

  test("registrations", () => {
    const list = listRegistrationsSchema.parse(fixture("list_registrations.json"))
    expect(list.registrations).toHaveLength(6)
    expect(list.registrations.map((r) => r.status)).toContain("onboarding")
  })
})

describe("fixture lookup keys", () => {
  test("keyed tools", () => {
    expect(fixtureKey("get_filing", { filing_id: 70001, merchant_id: "x" })).toBe("70001")
    expect(fixtureKey("get_transaction", { transaction_id: "tr_1" })).toBe("tr_1")
    expect(fixtureKey("get_sales_summary", { from: "2025-09-01", to: "2026-08-31" })).toBe("2025-09-01_2026-08-31")
    expect(fixtureKey("list_transactions", { cursor: "99" })).toBe("cursor-99")
  })
  test("un-keyed tools", () => {
    expect(fixtureKey("list_transactions", { limit: 25 })).toBeNull()
    expect(fixtureKey("get_nexus_study", { merchant_id: "x" })).toBeNull()
  })
})

describe("unlinked scenario", () => {
  test("account tools are recorded errors, merchant reads linked:false", () => {
    const dir = path.resolve(__dirname, "../../../fixtures/unlinked")
    const nexus = JSON.parse(readFileSync(path.join(dir, "get_nexus_study.json"), "utf8")) as { isError: boolean; data: { error_code: string } }
    expect(nexus.isError).toBe(true)
    expect(nexus.data.error_code).toBe("merchant_not_linked")
    const merchant = JSON.parse(readFileSync(path.join(dir, "get_merchant.json"), "utf8")) as { data: unknown }
    expect(getMerchantSchema.parse(merchant.data).merchant.linked).toBe(false)
  })
})
