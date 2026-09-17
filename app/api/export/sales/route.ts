import { buildMatrix, csvMetric, METRIC_LABELS, parseMetric, parseMonths, provenanceOf, type MatrixRow } from "@/components/tax/sales/aggregate"
import { csvResponse, provenanceLine, toCsv, type CsvColumn } from "@/lib/csv"
import { BUCKET_ORDER, bucketLabel } from "@/lib/liability"
import { getSalesSummary, trailingMonths } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

/**
 * CSV of the split-by-state matrix. Re-runs the same `get_sales_summary` call
 * the page made for the signed-in merchant; the query only chooses range and
 * metric, never whose data.
 */
export async function GET(request: Request): Promise<Response> {
  const [merchant, skin] = await Promise.all([requireMerchant(), currentSkin()])
  const query = new URL(request.url).searchParams
  const months = parseMonths(query.get("months") ?? undefined)
  const metric = parseMetric(query.get("metric") ?? undefined)
  const range = trailingMonths(months)

  const summary = await getSalesSummary(merchant.merchantId, range)
  if (!summary.ok) {
    return new Response(`Sales summary unavailable${summary.code ? ` (${summary.code})` : ""}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    })
  }

  const matrix = buildMatrix(summary.data.rows, metric)
  const columns: CsvColumn<MatrixRow>[] = [
    { header: "state", value: (row) => row.label },
    { header: "detail", value: (row) => row.detail ?? "" },
  ]
  for (const bucket of BUCKET_ORDER) {
    columns.push({
      header: `${bucketLabel(bucket, skin)} (${METRIC_LABELS[metric].toLowerCase()})`,
      value: (row) => csvMetric(row.cells[bucket], metric),
    })
  }
  columns.push({ header: `total (${METRIC_LABELS[metric].toLowerCase()})`, value: (row) => csvMetric(row.total, metric) })

  const body = toCsv([...matrix.rows, matrix.totals], columns, {
    provenance: `${provenanceLine(provenanceOf([summary.trace]))} Range ${range.from} to ${range.to}. Money in USD.`,
  })
  return csvResponse(`sales-split-${metric}-${range.from}-${range.to}.csv`, body)
}
