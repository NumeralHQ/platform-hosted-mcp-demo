import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { listRegistrationsSchema, nexusStudySchema } from "@/lib/numeral/schemas"
import { FIPS_TO_STATE } from "../us-states"
import {
  buildRows,
  exportRecord,
  mapStates,
  outsideUsRows,
  periodLabel,
  registrationStateOf,
  ruleInWords,
  sortRows,
  statusCounts,
  usRows,
} from "../model"

const FIXTURES = path.resolve(__dirname, "../../../../fixtures/ridgeline-linked")

function fixture(name: string): unknown {
  const raw = JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as { isError: boolean; data: unknown }
  expect(raw.isError).toBe(false)
  return raw.data
}

const study = nexusStudySchema.parse(fixture("get_nexus_study.json"))
const registrations = listRegistrationsSchema.parse(fixture("list_registrations.json"))

describe("ruleInWords", () => {
  test("sales or transactions, current or previous year", () => {
    expect(
      ruleInWords({
        sales_threshold: 10_000_000,
        volume_threshold: 200,
        conjunction: "or",
        period_type: "current_or_previous",
        currency: "USD",
        marketplace_sales_count_toward_threshold: true,
        wholesale_sales_count_toward_threshold: false,
      })
    ).toBe("$100,000 or 200 transactions, current or previous calendar year")
  })

  test("and-rule and sales-only rule", () => {
    expect(
      ruleInWords({
        sales_threshold: 50_000_000,
        volume_threshold: 100,
        conjunction: "and",
        period_type: "new_york",
        currency: "USD",
        marketplace_sales_count_toward_threshold: true,
        wholesale_sales_count_toward_threshold: false,
      })
    ).toBe("$500,000 and 100 transactions, previous four sales-tax quarters")
    expect(
      ruleInWords({
        sales_threshold: 10_000_000,
        volume_threshold: null,
        conjunction: null,
        period_type: "rolling_365_days",
        currency: "USD",
        marketplace_sales_count_toward_threshold: false,
        wholesale_sales_count_toward_threshold: false,
      })
    ).toBe("$100,000, trailing 12 months")
    expect(ruleInWords(null)).toBe("No economic-nexus rule on file")
  })

  test("unknown period literals still read as words", () => {
    expect(periodLabel("some_new_period")).toBe("some new period")
  })
})

describe("registration join", () => {
  test("status buckets", () => {
    expect(registrationStateOf("complete")).toBe("registered")
    expect(registrationStateOf("online_account_created")).toBe("registered")
    expect(registrationStateOf("onboarding")).toBe("in_progress")
    expect(registrationStateOf("waiting_for_mail")).toBe("in_progress")
    expect(registrationStateOf(null)).toBe("none")
    expect(registrationStateOf("something_else")).toBe("none")
  })
})

describe("rows from the recorded study", () => {
  const rows = sortRows(buildRows({ study, registrations }))

  test("counts and the nexus story", () => {
    expect(statusCounts(rows)).toEqual({ has_nexus: 6, approaching: 3, safe: 15 })
    const il = rows.find((r) => r.stateCode === "IL")
    const wa = rows.find((r) => r.stateCode === "WA")
    const ca = rows.find((r) => r.stateCode === "CA")
    expect(il?.marketplaceCounts).toBe(false)
    expect(wa?.marketplaceCounts).toBe(true)
    expect(ca?.source).toBe("physical")
    expect(ca?.thresholdPercent).toBe(54)
    expect(il?.registration.state).toBe("registered")
    expect(rows.find((r) => r.stateCode === "NJ")?.registration.state).toBe("in_progress")
    expect(rows.find((r) => r.stateCode === "NC")?.registration.state).toBe("none")
  })

  test("sort: has_nexus by collection start, then approaching and safe by percent desc", () => {
    expect(rows.slice(0, 6).map((r) => r.stateCode)).toEqual(["CA", "WA", "GA", "IL", "NJ", "OH"])
    const approaching = rows.filter((r) => r.status === "approaching").map((r) => r.thresholdPercent)
    expect(approaching).toEqual([85, 82.5, 82])
    const safe = rows.filter((r) => r.status === "safe").map((r) => r.thresholdPercent ?? -1)
    expect([...safe].sort((a, b) => b - a)).toEqual(safe)
    // Italy has no economic rule, so it sorts last among safe rows.
    expect(rows[rows.length - 1]?.jurisdictionId).toBe("IT")
  })

  test("US vs outside-US split and map props", () => {
    expect(usRows(rows)).toHaveLength(23)
    expect(outsideUsRows(rows).map((r) => r.name)).toEqual(["Italy"])
    const states = mapStates(rows)
    expect(states.every((s) => s.stateCode.length === 2)).toBe(true)
    expect(states.find((s) => s.stateCode === "GA")?.registered).toBe(true)
    expect(states.find((s) => s.stateCode === "OH")?.registered).toBe(false)
  })

  test("registrations unavailable reads as unknown", () => {
    const withoutRegs = buildRows({ study, registrations: null })
    expect(withoutRegs.every((r) => r.registration.state === "unknown")).toBe(true)
  })

  test("export record is flat strings", () => {
    const il = rows.find((r) => r.stateCode === "IL")
    expect(il && exportRecord(il)).toMatchObject({
      jurisdiction: "IL",
      status: "Has nexus",
      threshold_percent: "104.5",
      marketplace_sales_count: "No",
      registration: "Registered",
    })
  })
})

describe("FIPS map", () => {
  test("covers all fifty states and DC, and every study state", () => {
    const codes = new Set(Object.values(FIPS_TO_STATE))
    expect(codes.size).toBe(51)
    expect(codes.has("DC")).toBe(true)
    for (const row of usRows(buildRows({ study, registrations }))) {
      expect(codes.has(row.stateCode ?? "")).toBe(true)
    }
  })
})
