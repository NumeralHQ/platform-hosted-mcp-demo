import "server-only"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { callTool, hasKey } from "./client"
import {
  FixtureMissingError,
  NumeralKeyMissingError,
  NumeralToolError,
} from "./errors"
import { TOOL_KEY_KIND, type ToolName } from "./schemas"

/**
 * Three ways to answer a tool call:
 *
 * - live:   call https://mcp.numeralhq.com/mcp with the platform's keys.
 * - replay: read a recorded response from `fixtures/<scenario>/`. Lets anyone
 *           clone the repo and run it with zero keys.
 * - auto:   live, but fall back to the fixture per call when the live read
 *           cannot succeed here (no key, sandbox key on a live-only tool, the
 *           merchant is not linked yet, no study yet). Every fallback is
 *           flagged so the UI can badge the panel "Recorded data".
 *
 * A call's outcome is returned, not thrown, so a page can render one panel
 * from a fixture while the others are live.
 */
export type DataMode = "live" | "replay" | "auto"

export interface ToolCallTrace {
  tool: ToolName
  args: Record<string, unknown>
  source: "live" | "fixture"
  keyKind: "test" | "live" | null
  durationMs: number
  scope: string | null
  /** Set when the live call failed and a fixture answered instead. */
  fallbackReason: string | null
  /** Set when the call produced a structured Numeral error. */
  errorCode: string | null
}

export type ToolOutcome =
  | { ok: true; data: unknown; trace: ToolCallTrace }
  | { ok: false; error: NumeralToolError | Error; trace: ToolCallTrace }

export const DEFAULT_SCENARIO = "ridgeline-linked"
export const SCENARIOS = [
  "ridgeline-linked",
  "unlinked",
  "pending-first-run",
] as const
export type Scenario = (typeof SCENARIOS)[number]

export function dataMode(): DataMode {
  const raw = process.env.NUMERAL_MODE?.trim().toLowerCase()
  if (raw === "live" || raw === "replay" || raw === "auto") {
    return raw
  }
  // No keys at all means a fresh clone: replay is the only mode that works.
  return hasKey("test") || hasKey("live") ? "auto" : "replay"
}

export function fixturesRoot(): string {
  return process.env.NUMERAL_FIXTURES_DIR?.trim() || path.join(process.cwd(), "fixtures")
}

/**
 * Fixture files are `<tool>.json`, or `<tool>.<key>.json` when one argument
 * distinguishes calls (a filing id, a transaction id, a date range). Lookup
 * tries the scenario folder, then the default scenario, then the un-keyed
 * file, so a scenario only has to override what differs.
 */
export function fixtureKey(tool: ToolName, args: Record<string, unknown>): string | null {
  switch (tool) {
    case "get_filing":
      return args.filing_id === undefined ? null : String(args.filing_id)
    case "get_transaction":
      return typeof args.transaction_id === "string" ? args.transaction_id : null
    case "get_sales_summary":
      return typeof args.from === "string" && typeof args.to === "string"
        ? `${args.from}_${args.to}`
        : null
    case "list_transactions":
      return typeof args.cursor === "string" ? `cursor-${args.cursor}` : null
    default:
      return null
  }
}

interface FixtureFile {
  isError: boolean
  data: unknown
}

function readFixture(
  scenario: string,
  tool: ToolName,
  args: Record<string, unknown>
): FixtureFile {
  const key = fixtureKey(tool, args)
  const candidates: string[] = []
  for (const folder of [scenario, DEFAULT_SCENARIO]) {
    if (key) {
      candidates.push(path.join(fixturesRoot(), folder, `${tool}.${key}.json`))
    }
    candidates.push(path.join(fixturesRoot(), folder, `${tool}.json`))
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, "utf8")) as FixtureFile
    }
  }
  throw new FixtureMissingError(tool, key, scenario)
}

function fixtureOutcome(
  scenario: string,
  tool: ToolName,
  args: Record<string, unknown>,
  fallbackReason: string | null
): ToolOutcome {
  const startedAt = performance.now()
  const base: Omit<ToolCallTrace, "scope" | "errorCode" | "durationMs"> = {
    tool,
    args,
    source: "fixture",
    keyKind: null,
    fallbackReason,
  }
  try {
    const fixture = readFixture(scenario, tool, args)
    const durationMs = Math.round(performance.now() - startedAt)
    if (fixture.isError) {
      const body = fixture.data as { error_code?: string; error_message?: string }
      const error = new NumeralToolError(
        tool,
        body.error_code ?? "unknown_error",
        body.error_message ?? "Recorded error"
      )
      return { ok: false, error, trace: { ...base, durationMs, scope: null, errorCode: error.code } }
    }
    return {
      ok: true,
      data: fixture.data,
      trace: { ...base, durationMs, scope: scopeOf(fixture.data), errorCode: null },
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt)
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      trace: { ...base, durationMs, scope: null, errorCode: null },
    }
  }
}

function scopeOf(data: unknown): string | null {
  if (data && typeof data === "object" && "scope" in data) {
    const scope = (data as { scope?: unknown }).scope
    return typeof scope === "string" ? scope : null
  }
  return null
}

async function liveOutcome(tool: ToolName, args: Record<string, unknown>): Promise<ToolOutcome> {
  const startedAt = performance.now()
  try {
    const result = await callTool(tool, args)
    return {
      ok: true,
      data: result.data,
      trace: {
        tool,
        args,
        source: "live",
        keyKind: result.keyKind,
        durationMs: result.durationMs,
        scope: scopeOf(result.data),
        fallbackReason: null,
        errorCode: null,
      },
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt)
    const err = error instanceof Error ? error : new Error(String(error))
    return {
      ok: false,
      error: err,
      trace: {
        tool,
        args,
        source: "live",
        keyKind: hasKey(TOOL_KEY_KIND[tool]) ? TOOL_KEY_KIND[tool] : null,
        durationMs,
        scope: null,
        fallbackReason: null,
        errorCode: err instanceof NumeralToolError ? err.code : null,
      },
    }
  }
}

/**
 * In auto mode these live failures mean "this environment cannot answer the
 * call yet", not "the data is wrong", so the recorded fixture stands in.
 */
const AUTO_FALLBACK_CODES: ReadonlySet<string> = new Set([
  "live_mode_required",
  "merchant_not_linked",
  "merchant_not_found",
])

function autoFallbackReason(error: Error): string | null {
  if (error instanceof NumeralKeyMissingError) {
    return `no ${error.keyKind} key configured`
  }
  if (error instanceof NumeralToolError) {
    return AUTO_FALLBACK_CODES.has(error.code) ? error.code : null
  }
  // Network / HTTP failures: keep the demo alive.
  return error.message.startsWith("Numeral MCP") || error.name === "TypeError"
    ? "live call failed"
    : null
}

export interface DataSourceOptions {
  mode?: DataMode
  scenario?: string
  /** Force the not-connected state even when live says linked (admin demo toggle). */
  simulateUnlinked?: boolean
}

export class DataSource {
  readonly mode: DataMode
  readonly scenario: string
  readonly simulateUnlinked: boolean
  readonly trace: ToolCallTrace[] = []

  constructor(options: DataSourceOptions = {}) {
    this.mode = options.mode ?? dataMode()
    this.scenario = options.scenario ?? DEFAULT_SCENARIO
    this.simulateUnlinked = options.simulateUnlinked ?? false
  }

  async call(tool: ToolName, args: Record<string, unknown>): Promise<ToolOutcome> {
    const outcome = await this.resolve(tool, args)
    this.trace.push(outcome.trace)
    return outcome
  }

  private async resolve(tool: ToolName, args: Record<string, unknown>): Promise<ToolOutcome> {
    if (this.simulateUnlinked) {
      const simulated = fixtureOutcome("unlinked", tool, args, "simulated unlinked")
      // Only the merchant + account tools change when a merchant is unlinked.
      if (tool === "get_merchant" || tool === "list_merchants" || MERCHANT_LINKED.has(tool)) {
        return simulated
      }
    }
    if (this.mode === "replay") {
      return fixtureOutcome(this.scenario, tool, args, null)
    }
    const live = await liveOutcome(tool, args)
    if (live.ok || this.mode === "live") {
      return live
    }
    const reason = autoFallbackReason(live.error)
    if (reason === null) {
      return live
    }
    const fallback = fixtureOutcome(this.scenario, tool, args, reason)
    // If there is no fixture either, surface the original live error.
    return fallback.ok || !(fallback.error instanceof FixtureMissingError) ? fallback : live
  }
}

const MERCHANT_LINKED: ReadonlySet<ToolName> = new Set([
  "get_nexus_study",
  "list_filings",
  "get_filing",
  "list_registrations",
])

// ---------------------------------------------------------------------------
// Recording (local only): capture live responses as fixtures, redacted.
// ---------------------------------------------------------------------------

function redact(tool: ToolName, data: unknown): unknown {
  if (tool !== "list_merchants" && tool !== "get_merchant") {
    return data
  }
  const clone = JSON.parse(JSON.stringify(data)) as {
    merchant?: Record<string, unknown>
    merchants?: Array<Record<string, unknown>>
  }
  const scrub = (merchant: Record<string, unknown>): void => {
    merchant.email = "merchant@example.com"
    const address = merchant.default_address as Record<string, unknown> | undefined
    if (address) {
      address.address_line_1 = "1 Main St"
      address.address_line_2 = null
    }
  }
  if (clone.merchant) {
    scrub(clone.merchant)
  }
  for (const merchant of clone.merchants ?? []) {
    scrub(merchant)
  }
  return clone
}

export async function recordFixture(
  scenario: string,
  tool: ToolName,
  args: Record<string, unknown>
): Promise<{ file: string; isError: boolean }> {
  const folder = path.join(fixturesRoot(), scenario)
  mkdirSync(folder, { recursive: true })
  const key = fixtureKey(tool, args)
  const file = path.join(folder, key ? `${tool}.${key}.json` : `${tool}.json`)
  let payload: FixtureFile
  try {
    const result = await callTool(tool, args)
    payload = { isError: false, data: redact(tool, result.data) }
  } catch (error) {
    if (!(error instanceof NumeralToolError)) {
      throw error
    }
    payload = {
      isError: true,
      data: { error_code: error.code, error_message: error.message },
    }
  }
  writeFileSync(file, `${JSON.stringify(payload, null, 1)}\n`)
  return { file, isError: payload.isError }
}
