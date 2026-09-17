import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { DateTime } from "luxon"
import { type ZodType } from "zod"
import { DataSource, type ToolCallTrace, type ToolOutcome } from "./data-source"
import { NumeralToolError } from "./errors"
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
  type FilingDetail,
  type ListFilings,
  type ListMerchants,
  type ListRegistrations,
  type ListTransactions,
  type Merchant,
  type NexusStudy,
  type SalesSummary,
  type ToolName,
  type TransactionDetail,
} from "./schemas"

export { type ToolCallTrace } from "./data-source"
export * from "./schemas"
export { NumeralToolError } from "./errors"

/**
 * One DataSource per request so every panel on a page shares one trace,
 * which the Under-the-hood drawer renders. `cache` scopes it to the render.
 */
export const requestSource = cache(async (): Promise<DataSource> => {
  const jar = await cookies()
  const scenario = jar.get("demo_scenario")?.value
  const simulateUnlinked = jar.get("demo_simulate_unlinked")?.value === "1"
  const modeOverride = jar.get("demo_mode")?.value
  return new DataSource({
    scenario,
    simulateUnlinked,
    mode:
      modeOverride === "live" || modeOverride === "replay" || modeOverride === "auto"
        ? modeOverride
        : undefined,
  })
})

/**
 * Every panel gets one of these: either typed data or a Numeral error it can
 * branch on, plus the trace entry for the drawer. Nothing throws through to a
 * page for an expected condition like merchant_not_linked.
 */
export type Panel<T> =
  | { ok: true; data: T; trace: ToolCallTrace }
  | { ok: false; error: NumeralToolError | Error; code: string | null; trace: ToolCallTrace }

async function panel<T>(
  tool: ToolName,
  args: Record<string, unknown>,
  schema: ZodType<T>
): Promise<Panel<T>> {
  const source = await requestSource()
  const outcome: ToolOutcome = await source.call(tool, args)
  if (!outcome.ok) {
    return {
      ok: false,
      error: outcome.error,
      code: outcome.error instanceof NumeralToolError ? outcome.error.code : null,
      trace: outcome.trace,
    }
  }
  const parsed = schema.safeParse(outcome.data)
  if (!parsed.success) {
    return {
      ok: false,
      error: new Error(`Unexpected ${tool} response shape: ${parsed.error.issues[0]?.message ?? "invalid"}`),
      code: "unexpected_shape",
      trace: outcome.trace,
    }
  }
  return { ok: true, data: parsed.data, trace: outcome.trace }
}

// ---------------------------------------------------------------------------
// Per-view reads. Each one hard-codes its tool and builds its own arguments;
// the merchant id always comes from the server (session), never the browser.
// ---------------------------------------------------------------------------

export function listMerchants(limit = 25): Promise<Panel<ListMerchants>> {
  return panel("list_merchants", { limit }, listMerchantsSchema)
}

export async function getMerchant(merchantId: string): Promise<Panel<Merchant>> {
  const result = await panel("get_merchant", { merchant_id: merchantId }, getMerchantSchema)
  return result.ok ? { ...result, data: result.data.merchant } : result
}

export interface DateRange {
  /** YYYY-MM-DD inclusive */
  from: string
  /** YYYY-MM-DD inclusive */
  to: string
}

/** Last N whole months ending with the most recent completed month. */
export function trailingMonths(months: number, today = DateTime.utc()): DateRange {
  const lastClosed = today.startOf("month").minus({ days: 1 })
  const start = lastClosed.startOf("month").minus({ months: months - 1 })
  return { from: start.toISODate() ?? "", to: lastClosed.toISODate() ?? "" }
}

export function getSalesSummary(merchantId: string, range: DateRange): Promise<Panel<SalesSummary>> {
  return panel(
    "get_sales_summary",
    { merchant_id: merchantId, from: range.from, to: range.to },
    salesSummarySchema
  )
}

export function listTransactions(
  merchantId: string,
  options: { cursor?: string; limit?: number; processedAfter?: string; processedBefore?: string } = {}
): Promise<Panel<ListTransactions>> {
  return panel(
    "list_transactions",
    {
      merchant_id: merchantId,
      limit: options.limit ?? 25,
      ...(options.cursor ? { cursor: options.cursor } : {}),
      ...(options.processedAfter ? { processed_after: options.processedAfter } : {}),
      ...(options.processedBefore ? { processed_before: options.processedBefore } : {}),
    },
    listTransactionsSchema
  )
}

export async function getTransaction(transactionId: string): Promise<Panel<TransactionDetail>> {
  const result = await panel("get_transaction", { transaction_id: transactionId }, getTransactionSchema)
  return result.ok ? { ...result, data: result.data.transaction } : result
}

export function getNexusStudy(merchantId: string): Promise<Panel<NexusStudy>> {
  return panel("get_nexus_study", { merchant_id: merchantId }, nexusStudySchema)
}

export function listFilings(
  merchantId: string,
  options: { status?: string; jurisdictionId?: string; dueAfter?: string; dueBefore?: string; limit?: number } = {}
): Promise<Panel<ListFilings>> {
  return panel(
    "list_filings",
    {
      merchant_id: merchantId,
      limit: options.limit ?? 500,
      ...(options.status ? { status: options.status } : {}),
      ...(options.jurisdictionId ? { jurisdiction_id: options.jurisdictionId } : {}),
      ...(options.dueAfter ? { due_after: options.dueAfter } : {}),
      ...(options.dueBefore ? { due_before: options.dueBefore } : {}),
    },
    listFilingsSchema
  )
}

export async function getFiling(merchantId: string, filingId: number): Promise<Panel<FilingDetail>> {
  const result = await panel(
    "get_filing",
    { merchant_id: merchantId, filing_id: filingId },
    getFilingSchema
  )
  return result.ok ? { ...result, data: result.data.filing } : result
}

export function listRegistrations(merchantId: string): Promise<Panel<ListRegistrations>> {
  return panel("list_registrations", { merchant_id: merchantId }, listRegistrationsSchema)
}

/**
 * The trace collected so far in this request, for the Under-the-hood drawer.
 * Only meaningful inside a page render: React's `cache` scopes `requestSource`
 * to the render tree, so a route handler gets a fresh source per call and
 * should use the `trace` on each `Panel` it received instead.
 */
export async function currentTrace(): Promise<ToolCallTrace[]> {
  const source = await requestSource()
  return [...source.trace]
}

export async function currentMode(): Promise<{ mode: string; scenario: string; simulateUnlinked: boolean }> {
  const source = await requestSource()
  return { mode: source.mode, scenario: source.scenario, simulateUnlinked: source.simulateUnlinked }
}
