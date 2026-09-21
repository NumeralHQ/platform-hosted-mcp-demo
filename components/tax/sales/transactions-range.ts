import type { DateRange } from "@/lib/numeral"

/**
 * `list_transactions` filters on processed timestamps; the sales summary
 * range is whole days. Widen the day bounds to full UTC days so the two
 * panels and the export cover exactly the same orders.
 */
export function transactionWindow(range: DateRange): { processedAfter: string; processedBefore: string } {
  return {
    processedAfter: `${range.from}T00:00:00.000Z`,
    processedBefore: `${range.to}T23:59:59.999Z`,
  }
}

/** Pages the transactions export follows at most. */
export const EXPORT_MAX_PAGES = 4
