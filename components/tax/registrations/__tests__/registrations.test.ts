import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { listFilingsSchema, listRegistrationsSchema, nexusStudySchema } from "@/lib/numeral/schemas"
import { inferCadence } from "../cadence"
import { maskAccountNumber } from "../mask"
import { unregisteredWatchlist } from "../register-here-hint"
import { registrationBucket, registrationStatusLabel } from "../registration-status"
import { groupRegistrations } from "../registrations-table"

const FIXTURES = path.resolve(__dirname, "../../../../fixtures/ridgeline-linked")

function fixture(name: string): unknown {
  const raw = JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as { isError: boolean; data: unknown }
  expect(raw.isError).toBe(false)
  return raw.data
}

const ALL_STATUSES = [
  "onboarding",
  "ops_review",
  "fully_transferred",
  "externally_managed",
  "do_not_transfer",
  "unregistered",
  "waiting_for_mail",
  "documents_received",
  "online_account_created",
  "complete",
  "incomplete",
  "ready_to_file",
  "in_progress",
  "has_problems",
  "pending_2fa",
  "new_closure_request",
  "waiting_for_confirmation",
  "account_closed",
]

describe("registration status map", () => {
  test("every literal has a plain-language label that is not the literal", () => {
    for (const status of ALL_STATUSES) {
      const label = registrationStatusLabel(status)
      expect(label).not.toBe(status)
      expect(label).not.toContain("_")
    }
  })

  test("buckets", () => {
    for (const status of ["online_account_created", "fully_transferred", "complete", "ready_to_file"]) {
      expect(registrationBucket(status)).toBe("registered")
    }
    for (const status of ["onboarding", "in_progress", "ops_review", "waiting_for_mail", "documents_received", "incomplete", "pending_2fa", "has_problems"]) {
      expect(registrationBucket(status)).toBe("in_progress")
    }
    expect(registrationBucket("unregistered")).toBe("not_registered")
    for (const status of ["account_closed", "new_closure_request", "waiting_for_confirmation"]) {
      expect(registrationBucket(status)).toBe("closed")
    }
    expect(registrationBucket("externally_managed")).toBe("managed_elsewhere")
    expect(registrationBucket("do_not_transfer")).toBe("managed_elsewhere")
    expect(registrationBucket(null)).toBe("managed_elsewhere")
  })
})

describe("masking", () => {
  test("keeps only the last four characters, ignoring spaces", () => {
    expect(maskAccountNumber("102-345678")).toBe("•••• 5678")
    expect(maskAccountNumber("603 456 789")).toBe("•••• 6789")
    expect(maskAccountNumber("12")).toBe("•••• 12")
    expect(maskAccountNumber(null)).toBe("—")
  })
})

describe("with the Ridgeline fixtures", () => {
  const registrations = listRegistrationsSchema.parse(fixture("list_registrations.json")).registrations
  const filings = listFilingsSchema.parse(fixture("list_filings.json")).filings
  const study = nexusStudySchema.parse(fixture("get_nexus_study.json"))

  test("groups CA, IL, WA, GA as registered and NJ, OH as in progress", () => {
    const groups = groupRegistrations(registrations)
    expect(groups.map((g) => g.bucket)).toEqual(["registered", "in_progress"])
    expect(groups[0]?.registrations.map((r) => r.state_code)).toEqual(["CA", "GA", "IL", "WA"])
    expect(groups[1]?.registrations.map((r) => r.state_code)).toEqual(["NJ", "OH"])
  })

  test("infers quarterly for CA/WA/GA and monthly for IL from recent returns", () => {
    const cadence = inferCadence(filings)
    expect(cadence.get("US-CA")).toBe("Quarterly")
    expect(cadence.get("US-WA")).toBe("Quarterly")
    expect(cadence.get("US-GA")).toBe("Quarterly")
    expect(cadence.get("US-IL")).toBe("Monthly")
    expect(cadence.get("US-NJ")).toBeUndefined()
  })

  test("watchlist is the approaching states with no registration", () => {
    const watchlist = unregisteredWatchlist(study.jurisdictions, registrations)
    const codes = watchlist.map((j) => j.state_code).sort()
    expect(codes).toEqual(["HI", "MI", "NC"])
    for (const jurisdiction of watchlist) {
      expect(jurisdiction.status).toBe("approaching")
    }
  })
})
