import { DateTime } from "luxon"
import { describe, expect, test } from "vitest"
import type { FilingSummary, NexusJurisdiction, NexusStudy, SalesSummaryRow, TransactionDetail, TransactionSummary } from "@/lib/numeral/schemas"
import {
  formatDelta,
  headline,
  monthlySales,
  platformFeeRate,
  recentActivity,
  relativeTime,
  sortAttention,
  taxAttention,
  topStates,
} from "../aggregate"
import { balance } from "../platform-data"

function row(overrides: Partial<SalesSummaryRow>): SalesSummaryRow {
  return {
    month: "2026-08",
    country: "US",
    state: "CA",
    currency: "USD",
    liability: "marketplace_facilitated",
    transaction_count: 10,
    total_sales: 100_00,
    tax_collected: 8_00,
    ...overrides,
  }
}

describe("monthlySales / headline", () => {
  test("sums months across liabilities, ignores platform fee rows, sorts ascending", () => {
    const rows = [
      row({ month: "2026-08", total_sales: 500_00, transaction_count: 5 }),
      row({ month: "2026-08", liability: "merchant_responsible", total_sales: 300_00, transaction_count: 3 }),
      row({ month: "2026-08", liability: "platform_fees", total_sales: 40_00, transaction_count: 8 }),
      row({ month: "2026-07", total_sales: 400_00, transaction_count: 4 }),
    ]
    const months = monthlySales(rows)
    expect(months).toEqual([
      { month: "2026-07", sales: 400_00, orders: 4 },
      { month: "2026-08", sales: 800_00, orders: 8 },
    ])
    const head = headline(months)
    expect(head?.monthLabel).toBe("Aug 2026")
    expect(head?.sales).toBe(800_00)
    expect(head?.salesDelta).toBeCloseTo(1)
    expect(head?.ordersDelta).toBeCloseTo(1)
    expect(head?.trailingSales).toBe(1200_00)
  })

  test("no prior month means no delta; no rows means no headline", () => {
    expect(headline(monthlySales([row({})]))?.salesDelta).toBeNull()
    expect(headline([])).toBeNull()
  })

  test("formatDelta rounds and signs", () => {
    expect(formatDelta(0.124)).toBe("+12%")
    expect(formatDelta(-0.04)).toBe("−4%")
    expect(formatDelta(0.001)).toBe("0%")
    expect(formatDelta(null)).toBeNull()
  })

  test("platformFeeRate is fees over non-fee sales", () => {
    const rows = [row({ total_sales: 900_00 }), row({ liability: "platform_fees", total_sales: 90_00 })]
    expect(platformFeeRate(rows)).toBeCloseTo(0.1)
    expect(platformFeeRate([])).toBe(0)
  })
})

describe("topStates", () => {
  test("ranks US states by net sales with shares of the US total", () => {
    const rows = [
      row({ state: "CA", total_sales: 600_00 }),
      row({ state: "IL", total_sales: 300_00 }),
      row({ state: "IL", liability: "merchant_responsible", total_sales: 100_00 }),
      row({ state: "CA", liability: "platform_fees", total_sales: 50_00 }),
      row({ country: "IT", state: null, total_sales: 999_00 }),
    ]
    expect(topStates(rows, 1)).toEqual([{ code: "CA", name: "California", sales: 600_00, share: 0.6 }])
    expect(topStates(rows).map((s) => s.code)).toEqual(["CA", "IL"])
  })
})

describe("recentActivity", () => {
  function tx(overrides: Partial<TransactionSummary>): TransactionSummary {
    return {
      id: "tr_1",
      type: "PURCHASE",
      reference_order_id: "order-1",
      reference_payment_id: null,
      merchant_id: null,
      customer_currency_code: "USD",
      address_city: "Atlanta",
      address_province: "GA",
      address_postal_code: null,
      address_country: "US",
      transaction_processed_at: "2026-08-31T18:21:02.000Z",
      created_at: "2026-09-17T03:14:56.998Z",
      ...overrides,
    }
  }
  function detail(id: string, lines: { code: string; name: string; amount: number }[]): TransactionDetail {
    return {
      ...tx({ id }),
      calculation_id: null,
      filing_currency_code: "USD",
      filing_currency_code_rate: 1,
      address_line_1: null,
      address_line_2: null,
      updated_at: "2026-09-17T03:14:56.998Z",
      testmode: true,
      line_items: lines.map((line, index) => ({
        quantity: 1,
        product: { reference_product_name: line.name, product_tax_code: line.code },
        tax_jurisdictions: [],
        tax_amount: 0,
        amount_excluding_tax: line.amount,
        amount_including_tax: line.amount,
        line_item_id: `li_${index}`,
        type: null,
      })),
    }
  }

  test("groups the sale and its fee record into one order and ignores fee lines", () => {
    const transactions = [tx({ id: "tr_fee" }), tx({ id: "tr_sale" }), tx({ id: "tr_other", reference_order_id: "order-2", address_city: "Seattle", address_province: "WA" })]
    const details = new Map<string, TransactionDetail>([
      ["tr_fee", detail("tr_fee", [{ code: "PAYMENT_PROCESSING_SERVICES", name: "Fee", amount: 290 }])],
      ["tr_sale", detail("tr_sale", [{ code: "BOOKS", name: "Printed Trading Journal", amount: 48_00 }, { code: "CLOTHING_GENERAL", name: "Hoodie", amount: 60_00 }])],
    ])
    const items = recentActivity(transactions, details)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      key: "order-1",
      kind: "purchase",
      title: "New order: Printed Trading Journal +1 more",
      place: "Atlanta, GA",
      amount: 108_00,
      href: "/dashboard/tax/sales?tx=tr_sale",
    })
    expect(items[1]).toMatchObject({ key: "order-2", title: "New order", amount: null, place: "Seattle, WA" })
  })

  test("refunds are negative and labelled", () => {
    const transactions = [tx({ id: "tr_r", type: "REFUND", reference_order_id: "order-9" })]
    const details = new Map([["tr_r", detail("tr_r", [{ code: "BOOKS", name: "Playbook", amount: 20_00 }])]])
    expect(recentActivity(transactions, details)[0]).toMatchObject({ kind: "refund", title: "Refund: Playbook", amount: -20_00 })
  })

  test("relativeTime buckets", () => {
    const now = DateTime.fromISO("2026-09-21T12:00:00Z", { zone: "utc" })
    expect(relativeTime("2026-09-21T11:30:00Z", now)).toBe("30m ago")
    expect(relativeTime("2026-09-21T09:00:00Z", now)).toBe("3h ago")
    expect(relativeTime("2026-09-20T09:00:00Z", now)).toBe("Yesterday")
    expect(relativeTime("2026-09-18T09:00:00Z", now)).toBe("3 days ago")
    expect(relativeTime("2026-08-31T09:00:00Z", now)).toBe("Aug 31")
  })
})

describe("taxAttention", () => {
  const today = DateTime.fromISO("2026-09-21T12:00:00Z", { zone: "utc" })
  function filing(overrides: Partial<FilingSummary>): FilingSummary {
    return {
      id: "70013",
      state: "IL",
      jurisdiction_id: "us-il",
      status: "in_progress",
      period_starts_at: "2026-08-01T00:00:00.000Z",
      period_ends_at: "2026-08-31T00:00:00.000Z",
      due_on: "2026-10-20T00:00:00.000Z",
      filed_at: null,
      tax_collected: 1038.34,
      taxable_sales: 0,
      non_taxable_sales: 0,
      penalty_amount: 0,
      interest_amount: 0,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      ...overrides,
    }
  }
  function jurisdiction(overrides: Partial<NexusJurisdiction> & { pct?: number }): NexusJurisdiction {
    const { pct, ...rest } = overrides
    return {
      jurisdiction_id: "us-nc",
      state_code: "NC",
      jurisdiction_name: "North Carolina",
      has_nexus: false,
      nexus_source: null,
      status: "approaching",
      collection_start_date: null,
      collection_end_date: null,
      economic: {
        has_economic_nexus: false,
        threshold_percent: pct ?? 82,
        rule: null,
        current_window_start: null,
        current_window_end: null,
        current_sales_amount: null,
        current_transaction_count: null,
        current_qualifying_sales_amount: null,
        current_qualifying_transaction_count: null,
        current_marketplace_sales_amount: null,
        current_marketplace_transaction_count: null,
        current_wholesale_sales_amount: null,
        current_wholesale_transaction_count: null,
        current_currency: null,
        earliest_crossing_date: null,
        crossing_window_start: null,
        crossing_window_end: null,
        crossing_sales_amount: null,
        crossing_transaction_count: null,
      },
      physical: null,
      since_collection: { total_sales: null, taxable_sales: null, tax_collected: null, tax_owed: null, transaction_count: null },
      ...rest,
    }
  }
  const study: NexusStudy = {
    merchant_id: "mer_1",
    run_date: "2026-09-21",
    study_status: "available",
    jurisdictions: [jurisdiction({ pct: 82 }), jurisdiction({ jurisdiction_id: "us-mi", state_code: "MI", jurisdiction_name: "Michigan", pct: 85 }), jurisdiction({ jurisdiction_id: "us-ca", status: "has_nexus", has_nexus: true })],
    physical_presences: [],
  }

  test("a return awaiting approval beats the next due one, and the closest threshold wins", () => {
    const filings = [
      filing({ id: "1", due_on: "2026-10-20T00:00:00.000Z" }),
      filing({ id: "2", status: "pending_client_approval", due_on: "2026-09-20T00:00:00.000Z", tax_collected: 897.03 }),
      filing({ id: "3", status: "filed", due_on: "2026-08-20T00:00:00.000Z" }),
    ]
    const items = taxAttention({ filings, nexus: study, today })
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ key: "filing-2", tone: "urgent", title: "Approve your Illinois sales tax return", href: "/dashboard/tax/filings/2", action: "Review" })
    expect(items[0]?.detail).toContain("$897.03")
    expect(items[1]).toMatchObject({ key: "nexus-us-mi", href: "/dashboard/tax/nexus" })
    expect(items[1]?.title).toContain("85% of the way")
    expect(items[1]?.title).toContain("Michigan")
  })

  test("falls back to the next open return with nothing to do, and skips nexus when nothing is approaching", () => {
    const items = taxAttention({
      filings: [filing({ id: "1" })],
      nexus: { ...study, jurisdictions: [jurisdiction({ status: "safe", pct: 12 })] },
      today,
    })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ tone: "info", title: "Illinois sales tax return is being prepared", action: "View" })
  })

  test("pending first run and missing panels produce nothing", () => {
    expect(taxAttention({ filings: null, nexus: { ...study, study_status: "pending_first_run" }, today })).toEqual([])
  })

  test("sortAttention puts dated items first, ascending", () => {
    const sorted = sortAttention([
      { key: "b", dueOn: null, tone: "info", title: "", detail: "", href: "/", action: "" },
      { key: "c", dueOn: "2026-10-20", tone: "info", title: "", detail: "", href: "/", action: "" },
      { key: "a", dueOn: "2026-09-22", tone: "info", title: "", detail: "", href: "/", action: "" },
    ])
    expect(sorted.map((item) => item.key)).toEqual(["a", "c", "b"])
  })
})

describe("balance", () => {
  test("scales from the latest month and schedules the next Tuesday", () => {
    const today = DateTime.fromISO("2026-09-21T12:00:00Z", { zone: "utc" }) // a Monday
    const money = balance({
      headline: { monthLabel: "Aug 2026", sales: 1_000_000, orders: 100, salesDelta: null, ordersDelta: null, trailingSales: 0 },
      feeRate: 0.1,
      today,
    })
    expect(money.next.on).toBe("2026-09-22")
    expect(money.available + money.pending).toBeCloseTo(Math.round((1_000_000 / 4.33) * 0.9), -1)
    expect(money.recent.map((p) => p.on)).toEqual(["2026-09-15", "2026-09-08", "2026-09-01"])
  })
})
