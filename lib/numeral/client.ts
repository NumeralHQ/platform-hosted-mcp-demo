import "server-only"
import { NumeralKeyMissingError, NumeralToolError } from "./errors"
import { TOOL_KEY_KIND, type ToolName } from "./schemas"

/**
 * The Numeral MCP is one HTTPS endpoint speaking JSON-RPC over HTTP
 * (Model Context Protocol, Streamable HTTP transport, stateless: every
 * `tools/call` is an independent POST, no session or `initialize` needed).
 * Auth is the platform's Thomas secret key as a Bearer token; the key decides
 * the account and the mode (sk_test_ vs sk_prod_), so tools never take an
 * account id and a request cannot cross tenants.
 *
 * This file is the whole integration surface a platform needs. Nothing in it
 * is specific to the demo; the browser never sees it (`server-only`).
 */

export const DEFAULT_MCP_URL = "https://mcp.numeralhq.com/mcp"

export interface McpCallResult {
  /** Parsed JSON body of the tool result (already a plain object). */
  data: unknown
  /** True when the tool returned a structured error (`isError`). */
  isError: boolean
  durationMs: number
  keyKind: "test" | "live"
}

interface JsonRpcResponse {
  jsonrpc?: string
  id?: number | string
  result?: {
    isError?: boolean
    content?: Array<{ type: string; text?: string }>
  }
  error?: { code: number; message: string; data?: unknown }
}

export function mcpUrl(): string {
  return process.env.NUMERAL_MCP_URL?.trim() || DEFAULT_MCP_URL
}

export function keyFor(tool: ToolName): { kind: "test" | "live"; value: string } {
  const kind = TOOL_KEY_KIND[tool]
  const value =
    kind === "live"
      ? process.env.NUMERAL_LIVE_API_KEY?.trim()
      : process.env.NUMERAL_TEST_API_KEY?.trim()
  if (!value) {
    throw new NumeralKeyMissingError(tool, kind)
  }
  return { kind, value }
}

export function hasKey(kind: "test" | "live"): boolean {
  const value =
    kind === "live"
      ? process.env.NUMERAL_LIVE_API_KEY
      : process.env.NUMERAL_TEST_API_KEY
  return Boolean(value && value.trim())
}

/**
 * Some deployments answer with `application/json`, others with a single SSE
 * frame. Accept both and pull the JSON-RPC envelope out either way.
 */
function parseEnvelope(raw: string): JsonRpcResponse {
  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as JsonRpcResponse
  }
  for (const line of trimmed.split("\n")) {
    if (line.startsWith("data:")) {
      return JSON.parse(line.slice(5).trim()) as JsonRpcResponse
    }
  }
  throw new Error("Unrecognized MCP response body")
}

/**
 * Call one tool. Throws `NumeralToolError` when the server returns a
 * structured tool error so callers can branch on `error.code`
 * (merchant_not_linked, live_mode_required, ...).
 */
export async function callTool(
  tool: ToolName,
  args: Record<string, unknown>
): Promise<McpCallResult> {
  const key = keyFor(tool)
  const startedAt = performance.now()
  const response = await fetch(mcpUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key.value}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
    cache: "no-store",
  })
  const durationMs = Math.round(performance.now() - startedAt)
  const raw = await response.text()
  if (!response.ok) {
    throw new Error(`Numeral MCP HTTP ${response.status}: ${raw.slice(0, 200)}`)
  }
  const envelope = parseEnvelope(raw)
  if (envelope.error) {
    throw new Error(`Numeral MCP RPC error ${envelope.error.code}: ${envelope.error.message}`)
  }
  const text = envelope.result?.content?.find((c) => c.type === "text")?.text ?? "{}"
  const data: unknown = JSON.parse(text)
  if (envelope.result?.isError) {
    const body = data as { error_code?: string; error_message?: string }
    throw new NumeralToolError(
      tool,
      body.error_code ?? "unknown_error",
      body.error_message ?? "The Numeral MCP returned an error."
    )
  }
  return { data, isError: false, durationMs, keyKind: key.kind }
}

/** `tools/list`, for the integration page's live catalog. */
export async function listTools(keyKind: "test" | "live" = "test"): Promise<
  Array<{ name: string; description?: string; inputSchema?: unknown }>
> {
  const value =
    keyKind === "live"
      ? process.env.NUMERAL_LIVE_API_KEY?.trim()
      : process.env.NUMERAL_TEST_API_KEY?.trim()
  if (!value) {
    throw new NumeralKeyMissingError("tools/list" as ToolName, keyKind)
  }
  const response = await fetch(mcpUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${value}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    cache: "no-store",
  })
  const envelope = parseEnvelope(await response.text()) as JsonRpcResponse & {
    result?: { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> }
  }
  return envelope.result?.tools ?? []
}
