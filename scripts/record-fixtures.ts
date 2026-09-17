/**
 * Record the Numeral MCP responses the demo replays.
 *
 *   bun run record                                   # scenario ridgeline-linked, merchant ridgeline-trading
 *   bun run record -- --scenario unlinked --merchant ridgeline-trading
 *
 * Keys come from the shell or from `.env.local` / `.env`, which Bun loads on
 * its own before this file runs. Without a key the first call fails with
 * `NumeralKeyMissingError`, which names the variable to set.
 *
 * `lib/numeral/*` starts with `import "server-only"`, a Next.js build-time
 * guard that is not resolvable from Bun outside Next. Rather than change the
 * library, this script re-executes itself once with NODE_PATH pointing at a
 * tiny throwaway stub of that package, so the imports resolve to a no-op.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { ToolName } from "../lib/numeral/schemas"

const STUB_FLAG = "TUNDRA_SERVER_ONLY_STUB"
const DEFAULT_SCENARIO_ARG = "ridgeline-linked"
const DEFAULT_MERCHANT_ARG = "ridgeline-trading"

function parseArgs(argv: readonly string[]): { scenario: string; merchant: string } {
  let scenario = DEFAULT_SCENARIO_ARG
  let merchant = DEFAULT_MERCHANT_ARG
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === "--scenario" && next) {
      scenario = next
      i += 1
    } else if (arg === "--merchant" && next) {
      merchant = next
      i += 1
    } else if (arg?.startsWith("--scenario=")) {
      scenario = arg.slice("--scenario=".length)
    } else if (arg?.startsWith("--merchant=")) {
      merchant = arg.slice("--merchant=".length)
    } else {
      throw new Error(`Unknown argument "${arg}". Use --scenario <name> and/or --merchant <reference_merchant_id>.`)
    }
  }
  return { scenario, merchant }
}

function relaunchWithServerOnlyStub(): never {
  const stubRoot = path.join(tmpdir(), "tundra-server-only-stub")
  const pkg = path.join(stubRoot, "server-only")
  mkdirSync(pkg, { recursive: true })
  writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "server-only", version: "0.0.0", main: "index.js" }))
  writeFileSync(path.join(pkg, "index.js"), "module.exports = {}\n")
  const script = fileURLToPath(import.meta.url)
  const result = spawnSync(process.execPath, ["run", script, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_PATH: stubRoot, [STUB_FLAG]: "1" },
  })
  process.exit(result.status ?? 1)
}

async function main(): Promise<void> {
  if (process.env[STUB_FLAG] !== "1") {
    relaunchWithServerOnlyStub()
  }
  const { scenario, merchant } = parseArgs(process.argv.slice(2))

  // Imported here, after the stub is in place, so `server-only` resolves.
  const { recordFixture } = await import("../lib/numeral/data-source")
  const { trailingMonths } = await import("../lib/numeral/index")
  const { listTransactionsSchema, listFilingsSchema } = await import("../lib/numeral/schemas")

  console.log(`Recording scenario "${scenario}" for merchant "${merchant}"`)

  async function record(tool: ToolName, args: Record<string, unknown>): Promise<unknown> {
    const { file, isError } = await recordFixture(scenario, tool, args)
    console.log(`${isError ? "error " : "ok    "} ${path.relative(process.cwd(), file)}`)
    // Re-read what was written so dependent calls (filing ids, transaction ids) use the recorded payload.
    const payload = JSON.parse(readFileSync(file, "utf8")) as { isError: boolean; data: unknown }
    return payload.isError ? null : payload.data
  }

  await record("list_merchants", { limit: 25 })
  await record("get_merchant", { merchant_id: merchant })

  for (const months of [12, 24]) {
    const range = trailingMonths(months)
    await record("get_sales_summary", { merchant_id: merchant, from: range.from, to: range.to })
  }

  const transactions = await record("list_transactions", { merchant_id: merchant, limit: 25 })
  const firstTransaction = transactions ? listTransactionsSchema.safeParse(transactions) : null
  const firstTransactionId = firstTransaction?.success ? firstTransaction.data.transactions[0]?.id : undefined
  if (firstTransactionId) {
    await record("get_transaction", { transaction_id: firstTransactionId })
  } else {
    console.log("skip   get_transaction (no transactions returned)")
  }

  await record("get_nexus_study", { merchant_id: merchant })
  await record("list_registrations", { merchant_id: merchant })

  const filings = await record("list_filings", { merchant_id: merchant, limit: 500 })
  const parsedFilings = filings ? listFilingsSchema.safeParse(filings) : null
  const filingIds = parsedFilings?.success ? parsedFilings.data.filings.map((f) => f.id) : []
  for (const filingId of filingIds) {
    await record("get_filing", { merchant_id: merchant, filing_id: Number(filingId) })
  }
  if (filingIds.length === 0) {
    console.log("skip   get_filing (no filings returned)")
  }

  console.log("Done.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  process.exit(1)
})
