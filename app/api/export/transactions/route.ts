import { parseMonths, provenanceOf } from "@/components/tax/sales/aggregate"
import { EXPORT_MAX_PAGES, transactionWindow } from "@/components/tax/sales/transactions-range"
import { csvResponse, provenanceLine, toCsv, type CsvColumn } from "@/lib/csv"
import { listTransactions, trailingMonths, type ToolCallTrace, type TransactionSummary } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"

/**
 * CSV of the merchant's transactions for the range, following `cursor` for
 * up to EXPORT_MAX_PAGES pages. `list_transactions` carries no amounts, so
 * neither does this file; the sales export is the money view. Stops early
 * when a cursor repeats, which is what the recorded fixture does after page 1.
 */
export async function GET(request: Request): Promise<Response> {
  const merchant = await requireMerchant()
  const query = new URL(request.url).searchParams
  const months = parseMonths(query.get("months") ?? undefined)
  const range = trailingMonths(months)
  const window = transactionWindow(range)

  const rows: TransactionSummary[] = []
  const traces: ToolCallTrace[] = []
  const seenCursors = new Set<string>()
  const seenIds = new Set<string>()
  let cursor: string | undefined
  for (let pageIndex = 0; pageIndex < EXPORT_MAX_PAGES; pageIndex += 1) {
    const page = await listTransactions(merchant.merchantId, {
      limit: 25,
      cursor,
      processedAfter: window.processedAfter,
      processedBefore: window.processedBefore,
    })
    traces.push(page.trace)
    if (!page.ok) {
      if (rows.length === 0) {
        return new Response(`Transactions unavailable${page.code ? ` (${page.code})` : ""}`, {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        })
      }
      break
    }
    const next = page.data.cursor
    // The recording answers every cursor with page 1; an unchanged cursor means
    // this page is a repeat, so it contributes nothing and the walk ends.
    if (next !== null && next === cursor) {
      break
    }
    for (const transaction of page.data.transactions) {
      if (!seenIds.has(transaction.id)) {
        seenIds.add(transaction.id)
        rows.push(transaction)
      }
    }
    if (!page.data.has_more || !next || seenCursors.has(next)) {
      break
    }
    seenCursors.add(next)
    cursor = next
  }

  const columns: CsvColumn<TransactionSummary>[] = [
    { header: "transaction_id", value: (row) => row.id },
    { header: "processed_at", value: (row) => row.transaction_processed_at },
    { header: "type", value: (row) => row.type },
    { header: "reference_order_id", value: (row) => row.reference_order_id },
    { header: "reference_payment_id", value: (row) => row.reference_payment_id },
    { header: "currency", value: (row) => row.customer_currency_code },
    { header: "city", value: (row) => row.address_city },
    { header: "province", value: (row) => row.address_province },
    { header: "postal_code", value: (row) => row.address_postal_code },
    { header: "country", value: (row) => row.address_country },
  ]
  const body = toCsv(rows, columns, {
    provenance: `${provenanceLine(provenanceOf(traces))} Range ${range.from} to ${range.to}; first ${traces.length} page(s), ${rows.length} rows. Amounts are on get_transaction, not in this file.`,
  })
  return csvResponse(`transactions-${range.from}-${range.to}.csv`, body)
}
