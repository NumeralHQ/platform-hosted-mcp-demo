/**
 * Zod schemas for the nine read tools the demo calls on the Numeral MCP.
 * Shapes mirror `mcp/numeral-mcp/lib/tools/*.ts` on the Numeral side.
 *
 * Units differ per tool and are normalized at the edges, never guessed in
 * components:
 * - get_sales_summary: `total_sales` / `tax_collected` are minor-unit strings.
 * - get_nexus_study: every amount is a minor-unit number (cents).
 * - list_filings / get_filing: decimal strings in dollars.
 * - get_transaction: line-item amounts are minor-unit numbers.
 */
import { z } from "zod"

const minorString = z.union([z.string(), z.number()]).transform(Number)
const dollarString = z.union([z.string(), z.number(), z.null()]).transform((v) =>
  v === null ? 0 : Number(v)
)
const isoDate = z.string()

// ---------------------------------------------------------------------------
// Scope (present on merchant-linked account tools)
// ---------------------------------------------------------------------------

export const scopeSchema = z.object({
  scope: z.enum(["account", "merchant_account"]).optional(),
  merchant_id: z.string().optional(),
  reference_merchant_id: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

export const merchantSchema = z.object({
  id: z.string(),
  reference_merchant_id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  default_address: z.object({
    address_line_1: z.string(),
    address_line_2: z.string().nullable(),
    address_city: z.string(),
    address_province: z.string(),
    address_postal_code: z.string(),
    address_country: z.string(),
  }),
  tax_ids: z.array(z.object({ type: z.string(), value: z.string() })),
  metadata: z.unknown().nullable(),
  linked: z.boolean(),
  created_at: isoDate,
  updated_at: isoDate,
})
export type Merchant = z.infer<typeof merchantSchema>

export const listMerchantsSchema = z.object({
  merchants: z.array(merchantSchema),
  has_more: z.boolean(),
  cursor: z.string().nullable(),
})
export type ListMerchants = z.infer<typeof listMerchantsSchema>

export const getMerchantSchema = z.object({ merchant: merchantSchema })

// ---------------------------------------------------------------------------
// Sales summary (platform's own rows; works on the test key)
// ---------------------------------------------------------------------------

export const salesSummaryRowSchema = z.object({
  month: z.string(),
  country: z.string(),
  state: z.string().nullable(),
  currency: z.string(),
  liability: z.string(),
  transaction_count: z.number(),
  /** Minor units after transform. */
  total_sales: minorString,
  /** Minor units after transform. */
  tax_collected: minorString,
})
export type SalesSummaryRow = z.infer<typeof salesSummaryRowSchema>

export const salesSummarySchema = z.object({
  merchant_id: z.string().nullable(),
  from: z.string(),
  to: z.string(),
  rows: z.array(salesSummaryRowSchema),
})
export type SalesSummary = z.infer<typeof salesSummarySchema>

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const transactionSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  reference_order_id: z.string().nullable(),
  reference_payment_id: z.string().nullable(),
  merchant_id: z.string().nullable(),
  customer_currency_code: z.string().nullable(),
  address_city: z.string().nullable(),
  address_province: z.string().nullable(),
  address_postal_code: z.string().nullable(),
  address_country: z.string().nullable(),
  transaction_processed_at: isoDate,
  created_at: isoDate,
})
export type TransactionSummary = z.infer<typeof transactionSummarySchema>

export const listTransactionsSchema = z.object({
  transactions: z.array(transactionSummarySchema),
  has_more: z.boolean(),
  cursor: z.string().nullable(),
})
export type ListTransactions = z.infer<typeof listTransactionsSchema>

export const taxJurisdictionSchema = z.object({
  tax_rate: z.number(),
  tax_type: z.string(),
  rate_type: z.string(),
  fee_amount: z.number().optional(),
  tax_due_decimal: z.number().optional(),
  tax_authority_name: z.string(),
  tax_authority_type: z.string().optional(),
})

export const lineItemSchema = z.object({
  quantity: z.number(),
  product: z.object({
    reference_line_item_id: z.string().nullable().optional(),
    reference_product_id: z.string().nullable().optional(),
    reference_product_name: z.string().nullable().optional(),
    product_tax_code: z.string().nullable().optional(),
  }),
  tax_jurisdictions: z.array(taxJurisdictionSchema),
  /** Minor units. */
  tax_amount: z.number(),
  /** Minor units. */
  amount_excluding_tax: z.number(),
  /** Minor units. */
  amount_including_tax: z.number(),
  line_item_id: z.string(),
  type: z.string().nullable(),
})
export type LineItem = z.infer<typeof lineItemSchema>

export const transactionDetailSchema = transactionSummarySchema.extend({
  calculation_id: z.string().nullable(),
  filing_currency_code: z.string().nullable(),
  filing_currency_code_rate: z.number(),
  address_line_1: z.string().nullable(),
  address_line_2: z.string().nullable(),
  line_items: z.array(lineItemSchema),
  updated_at: isoDate,
  testmode: z.boolean(),
})
export type TransactionDetail = z.infer<typeof transactionDetailSchema>

export const getTransactionSchema = z.object({
  transaction: transactionDetailSchema,
})

// ---------------------------------------------------------------------------
// Nexus study (Nexus V2; merchant-linked)
// ---------------------------------------------------------------------------

export const nexusRuleSchema = z.object({
  /** Minor units. */
  sales_threshold: z.number().nullable(),
  volume_threshold: z.number().nullable(),
  conjunction: z.string().nullable(),
  period_type: z.string(),
  currency: z.string(),
  marketplace_sales_count_toward_threshold: z.boolean(),
  wholesale_sales_count_toward_threshold: z.boolean(),
})

export const economicNexusSchema = z.object({
  has_economic_nexus: z.boolean(),
  threshold_percent: z.number(),
  rule: nexusRuleSchema.nullable(),
  current_window_start: isoDate.nullable(),
  current_window_end: isoDate.nullable(),
  current_sales_amount: z.number().nullable(),
  current_transaction_count: z.number().nullable(),
  current_qualifying_sales_amount: z.number().nullable(),
  current_qualifying_transaction_count: z.number().nullable(),
  current_marketplace_sales_amount: z.number().nullable(),
  current_marketplace_transaction_count: z.number().nullable(),
  current_wholesale_sales_amount: z.number().nullable(),
  current_wholesale_transaction_count: z.number().nullable(),
  current_currency: z.string().nullable(),
  earliest_crossing_date: isoDate.nullable(),
  crossing_window_start: isoDate.nullable(),
  crossing_window_end: isoDate.nullable(),
  crossing_sales_amount: z.number().nullable(),
  crossing_transaction_count: z.number().nullable(),
})

export const nexusJurisdictionSchema = z.object({
  jurisdiction_id: z.string(),
  state_code: z.string().nullable(),
  jurisdiction_name: z.string(),
  has_nexus: z.boolean(),
  nexus_source: z.enum(["economic", "physical", "both"]).nullable(),
  status: z.enum(["has_nexus", "approaching", "safe"]),
  collection_start_date: isoDate.nullable(),
  collection_end_date: isoDate.nullable(),
  economic: economicNexusSchema.nullable(),
  physical: z
    .object({
      has_physical_nexus: z.boolean(),
      current_presence_types: z.array(z.string()),
      earliest_nexus_date: isoDate.nullable(),
      nexus_ended_date: isoDate.nullable(),
    })
    .nullable(),
  since_collection: z.object({
    total_sales: z.number().nullable(),
    taxable_sales: z.number().nullable(),
    tax_collected: z.number().nullable(),
    tax_owed: z.number().nullable(),
    transaction_count: z.number().nullable(),
  }),
})
export type NexusJurisdiction = z.infer<typeof nexusJurisdictionSchema>

export const nexusStudySchema = scopeSchema.extend({
  run_date: isoDate.nullable(),
  study_status: z.enum(["available", "pending_first_run"]),
  jurisdictions: z.array(nexusJurisdictionSchema),
  physical_presences: z.array(
    z.object({
      jurisdiction_id: z.string(),
      rule: z.string(),
      starts_on: isoDate.nullable(),
      manual_entry: z.boolean(),
    })
  ),
})
export type NexusStudy = z.infer<typeof nexusStudySchema>

// ---------------------------------------------------------------------------
// Filings (merchant-linked)
// ---------------------------------------------------------------------------

export const FILING_STATUSES = [
  "unfiled",
  "in_progress",
  "pending_admin_approval",
  "pending_client_approval",
  "client_approved",
  "filed",
  "client_rejected",
  "admin_rejected",
  "has_problems",
  "canceled",
  "on_hold",
  "transmitting",
  "pending_ack",
  "pending_payment",
  "pni_portal_review",
  "pending_payment_ack",
] as const

export const filingSummarySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  state: z.string().nullable(),
  jurisdiction_id: z.string(),
  status: z.string().nullable(),
  period_starts_at: isoDate.nullable(),
  period_ends_at: isoDate.nullable(),
  due_on: isoDate.nullable(),
  filed_at: isoDate.nullable(),
  /** Dollars after transform. */
  tax_collected: dollarString,
  taxable_sales: dollarString,
  non_taxable_sales: dollarString,
  penalty_amount: dollarString,
  interest_amount: dollarString,
  created_at: isoDate,
  updated_at: isoDate,
})
export type FilingSummary = z.infer<typeof filingSummarySchema>

export const listFilingsSchema = scopeSchema.extend({
  filings: z.array(filingSummarySchema),
})
export type ListFilings = z.infer<typeof listFilingsSchema>

export const filingDetailSchema = filingSummarySchema.extend({
  calculated_sales_data: z.unknown().nullable(),
})
export type FilingDetail = z.infer<typeof filingDetailSchema>

export const getFilingSchema = scopeSchema.extend({ filing: filingDetailSchema })

// ---------------------------------------------------------------------------
// Registrations (merchant-linked)
// ---------------------------------------------------------------------------

export const registrationSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  jurisdiction_id: z.string(),
  state_code: z.string().nullable(),
  status: z.string().nullable(),
  account_number: z.string().nullable(),
  type: z.string().nullable(),
  start_date_on: isoDate.nullable(),
  due_date_on: isoDate.nullable(),
  completed_at: isoDate.nullable(),
  deregistered_on: isoDate.nullable(),
  created_at: isoDate,
  updated_at: isoDate,
})
export type Registration = z.infer<typeof registrationSchema>

export const listRegistrationsSchema = scopeSchema.extend({
  registrations: z.array(registrationSchema),
})
export type ListRegistrations = z.infer<typeof listRegistrationsSchema>

// ---------------------------------------------------------------------------
// Tool catalog
// ---------------------------------------------------------------------------

export const TOOL_NAMES = [
  "list_merchants",
  "get_merchant",
  "get_sales_summary",
  "list_transactions",
  "get_transaction",
  "get_nexus_study",
  "list_filings",
  "get_filing",
  "list_registrations",
] as const
export type ToolName = (typeof TOOL_NAMES)[number]

/**
 * Which key each tool needs. Sales tools read the platform's own rows and
 * work in test mode, where marketplace tax is nonzero without the platform
 * holding registrations. Merchant and account tools read through the
 * merchant link, which the MCP only allows on the live key.
 */
export const TOOL_KEY_KIND: Record<ToolName, "test" | "live"> = {
  list_merchants: "live",
  get_merchant: "live",
  get_sales_summary: "test",
  list_transactions: "test",
  get_transaction: "test",
  get_nexus_study: "live",
  list_filings: "live",
  get_filing: "live",
  list_registrations: "live",
}

/** Tools that are only meaningful with `merchant_id` on a linked account. */
export const MERCHANT_LINKED_TOOLS: ReadonlySet<ToolName> = new Set([
  "get_nexus_study",
  "list_filings",
  "get_filing",
  "list_registrations",
])
