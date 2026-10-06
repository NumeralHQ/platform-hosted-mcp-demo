import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { DateTime } from "luxon"
import { listFilingsSchema, listRegistrationsSchema, nexusStudySchema, salesSummarySchema } from "@/lib/numeral/schemas"
import {
  deriveChanges,
  filingOutlook,
  splitRemittance,
  stateOf,
  summarizeNexus,
  summarizeRegistrations,
} from "../aggregate"

const FIXTURES = path.resolve(__dirname, "../../../../fixtures")
const TODAY = DateTime.fromISO("2026-09-17", { zone: "utc" })

function fixture(scenario: string, name: string): unknown {
  const raw = JSON.parse(readFileSync(path.join(FIXTURES, scenario, name), "utf8")) as {
    isError: boolean
    data: unknown
  }
  expect(raw.isError).toBe(false)
  return raw.data
}

const summary = salesSummarySchema.parse(fixture("ridgeline-linked", "get_sales_summary.2025-09-01_2026-08-31.json"))
const study = nexusStudySchema.parse(fixture("ridgeline-linked", "get_nexus_study.json"))
const filings = listFilingsSchema.parse(fixture("ridgeline-linked", "list_filings.json")).filings
const registrations = listRegistrationsSchema.parse(fixture("ridgeline-linked", "list_registrations.json")).registrations
const pendingStudy = nexusStudySchema.parse(fixture("pending-first-run", "get_nexus_study.json"))

describe("splitRemittance", () => {
  const split = splitRemittance(summary.rows, { from: summary.from, to: summary.to })

  test("totals per bucket match the rows summed by liability", () => {
    const byBucket = new Map(split.totals.map((total) => [total.bucket, total]))
    expect(byBucket.get("platform_remits")?.taxMinor).toBe(389120)
    expect(byBucket.get("platform_remits")?.salesMinor).toBe(5333100)
    expect(byBucket.get("platform_remits")?.orders).toBe(728)
    expect(byBucket.get("merchant_remits")?.taxMinor).toBe(258510)
    expect(byBucket.get("merchant_remits")?.orders).toBe(517)
    expect(byBucket.get("platform_fees")?.taxMinor).toBe(0)
    expect(byBucket.get("platform_fees")?.salesMinor).toBe(190835)
    expect(byBucket.get("off_platform")?.orders).toBe(0)
  })

  test("the tax total reconciles: buckets sum to the raw rows", () => {
    const raw = summary.rows.reduce((sum, row) => sum + row.tax_collected, 0)
    const bucketed = split.totals.reduce((sum, total) => sum + total.taxMinor, 0)
    expect(bucketed).toBe(raw)
  })

  test("present buckets follow BUCKET_ORDER and exclude off_platform when absent", () => {
    expect(split.presentBuckets).toEqual(["platform_remits", "merchant_remits", "platform_fees"])
  })

  test("one point per month across the range, ascending, and months reconcile to totals", () => {
    expect(split.months.map((point) => point.month)).toEqual([
      "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
      "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
    ])
    const monthly = split.months.reduce((sum, point) => sum + point.platform_remits + point.merchant_remits, 0)
    expect(monthly).toBe(389120 + 258510)
  })

  test("counts non-US orders without dropping them from the buckets", () => {
    const nonUs = summary.rows.filter((row) => row.country !== "US").reduce((sum, row) => sum + row.transaction_count, 0)
    expect(split.nonUsOrders).toBe(nonUs)
    expect(split.nonUsOrders).toBeGreaterThan(0)
  })

  test("an empty range still yields zeroed buckets and no months", () => {
    const empty = splitRemittance([], { from: "2026-02-01", to: "2026-01-31" })
    expect(empty.months).toEqual([])
    expect(empty.presentBuckets).toEqual([])
    expect(empty.totals).toHaveLength(4)
  })
})

describe("summarizeNexus", () => {
  const nexus = summarizeNexus(study)

  test("counts by status", () => {
    expect(nexus.hasNexus).toBe(6)
    expect(nexus.approaching).toBe(3)
    expect(nexus.safe).toBe(15)
    expect(nexus.hasNexus + nexus.approaching + nexus.safe).toBe(study.jurisdictions.length)
  })

  test("top approaching state is the highest threshold_percent", () => {
    expect(nexus.topApproaching?.state_code).toBe("MI")
    expect(nexus.topApproaching?.economic?.threshold_percent).toBe(85)
  })

  test("marketplace-rule split ignores jurisdictions without a rule", () => {
    expect(nexus.marketplaceCounts).toBe(14)
    expect(nexus.marketplaceExcluded).toBe(9)
    const withRule = study.jurisdictions.filter((jurisdiction) => jurisdiction.economic?.rule).length
    expect(nexus.marketplaceCounts + nexus.marketplaceExcluded).toBe(withRule)
  })

  test("Illinois excludes marketplace sales and Washington counts them", () => {
    const il = study.jurisdictions.find((jurisdiction) => jurisdiction.state_code === "IL")
    const wa = study.jurisdictions.find((jurisdiction) => jurisdiction.state_code === "WA")
    expect(il?.economic?.rule?.marketplace_sales_count_toward_threshold).toBe(false)
    expect(wa?.economic?.rule?.marketplace_sales_count_toward_threshold).toBe(true)
  })
})

describe("filingOutlook", () => {
  const outlook = filingOutlook(filings)

  test("the next filing is the soonest non-filed return by due_on", () => {
    expect(outlook.next?.id).toBe("70013")
    expect(outlook.next?.state).toBe("IL")
    expect(outlook.next?.due_on?.slice(0, 10)).toBe("2026-09-20")
  })

  test("counts returns waiting for the merchant", () => {
    expect(outlook.awaitingApproval).toBe(1)
    expect(outlook.openCount).toBe(5)
  })

  test("filed and canceled returns are never next", () => {
    const outlookFiled = filingOutlook(filings.filter((filing) => filing.status === "filed"))
    expect(outlookFiled.next).toBeNull()
    expect(outlookFiled.openCount).toBe(0)
  })
})

describe("summarizeRegistrations", () => {
  const summaryRegs = summarizeRegistrations(registrations)

  test("registered vs in progress by status", () => {
    expect(summaryRegs.registered.map(stateOf)).toEqual(["CA", "IL", "WA", "GA"])
    expect(summaryRegs.inProgress.map(stateOf)).toEqual(["NJ", "OH"])
    expect(summaryRegs.other).toEqual([])
  })

  test("stateOf falls back to the jurisdiction id", () => {
    expect(stateOf({ state_code: null, jurisdiction_id: "US-TX" })).toBe("TX")
  })
})

describe("deriveChanges", () => {
  const events = deriveChanges({ study, filings, marketplaceChannel: "Tundra Discover", today: TODAY })

  test("returns between four and six events, newest first", () => {
    expect(events.length).toBeGreaterThanOrEqual(4)
    expect(events.length).toBeLessThanOrEqual(6)
    for (let index = 1; index < events.length; index += 1) {
      expect(events[index - 1].date.localeCompare(events[index].date)).toBeGreaterThanOrEqual(0)
    }
  })

  test("leads with the Illinois return due Sep 20 and includes the approaching states", () => {
    expect(events[0]?.kind).toBe("due")
    expect(events[0]?.title).toContain("IL return due Sep 20, 2026")
    const approaching = events.find((event) => event.kind === "approaching")
    expect(approaching?.detail).toContain("MI 85%")
    expect(approaching?.detail).toContain("HI 83%")
    expect(approaching?.detail).toContain("NC 82%")
  })

  test("recent filings are within 60 days and link to the filings tab", () => {
    const filed = events.filter((event) => event.kind === "filed")
    expect(filed.length).toBeGreaterThan(0)
    for (const event of filed) {
      expect(DateTime.fromISO(event.date) >= TODAY.minus({ days: 60 })).toBe(true)
      expect(event.href).toBe("/dashboard/tax/filings")
    }
  })

  test("a crossing event names the state and whether marketplace sales counted", () => {
    const all = deriveChanges({ study, filings: [], marketplaceChannel: "Tundra Discover", today: TODAY })
    const illinois = all.find((event) => event.kind === "crossed" && event.title.includes("Illinois"))
    expect(illinois?.date).toBe("2026-02-14")
    expect(illinois?.detail).toContain("did not count")
    expect(illinois?.href).toBe("/dashboard/tax/nexus")
  })

  test("a pending study contributes no nexus events", () => {
    const pending = deriveChanges({ study: pendingStudy, filings, marketplaceChannel: "Tundra Discover", today: TODAY })
    expect(pending.some((event) => event.kind === "crossed" || event.kind === "approaching")).toBe(false)
    expect(pending.some((event) => event.kind === "due")).toBe(true)
  })

  test("no data yields no events", () => {
    expect(deriveChanges({ study: null, filings: [], marketplaceChannel: "x", today: TODAY })).toEqual([])
  })
})
