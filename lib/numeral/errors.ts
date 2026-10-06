/**
 * Error codes the Numeral MCP returns inside a tool result (`isError: true`,
 * body `{ error_code, error_message }`). The Tax page branches on these; the
 * demo never shows a raw stack trace for any of them.
 */
export const NUMERAL_ERROR_CODES = {
  /** Merchant-linked reads need the platform's live (sk_prod_) key. */
  liveModeRequired: "live_mode_required",
  /** The merchant_id is not one of the platform's merchants. */
  merchantNotFound: "merchant_not_found",
  /**
   * The merchant has not connected their own Numeral account, or has not
   * switched on sharing it with the platform. The UI shows the connect card.
   */
  merchantNotLinked: "merchant_not_linked",
  filingNotFound: "filing_not_found",
  transactionNotFound: "transaction_not_found",
  internalError: "internal_error",
} as const

export type NumeralErrorCode =
  (typeof NUMERAL_ERROR_CODES)[keyof typeof NUMERAL_ERROR_CODES]

export class NumeralToolError extends Error {
  readonly code: string
  readonly tool: string

  constructor(tool: string, code: string, message: string) {
    super(message)
    this.name = "NumeralToolError"
    this.tool = tool
    this.code = code
  }

  /** True when the account panels should collapse to the connect card. */
  get isNotLinked(): boolean {
    return this.code === NUMERAL_ERROR_CODES.merchantNotLinked
  }
}

/** The key needed for a tool is not configured in this environment. */
export class NumeralKeyMissingError extends Error {
  readonly tool: string
  readonly keyKind: "test" | "live"

  constructor(tool: string, keyKind: "test" | "live") {
    super(
      `${tool} needs the ${keyKind === "live" ? "NUMERAL_LIVE_API_KEY" : "NUMERAL_TEST_API_KEY"} environment variable`
    )
    this.name = "NumeralKeyMissingError"
    this.tool = tool
    this.keyKind = keyKind
  }
}

/** No fixture exists for this call in replay mode. */
export class FixtureMissingError extends Error {
  constructor(tool: string, key: string | null, scenario: string) {
    super(
      `No fixture for ${tool}${key ? ` (${key})` : ""} in scenario "${scenario}"`
    )
    this.name = "FixtureMissingError"
  }
}
