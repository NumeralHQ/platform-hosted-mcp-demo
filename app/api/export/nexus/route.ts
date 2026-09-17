import { buildRows, exportRecord, sortRows, usRows } from "@/components/tax/nexus/model"
import { csvResponse, provenanceLine, toCsv, type CsvColumn } from "@/lib/csv"
import { getNexusStudy, listRegistrations, type ToolCallTrace } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"

/**
 * The jurisdiction table as CSV. Re-runs the same two Numeral calls the page
 * made, for the signed-in merchant only, and stamps where the data came from.
 */

type ExportRow = ReturnType<typeof exportRecord>

const COLUMNS: readonly CsvColumn<ExportRow>[] = [
  { header: "state", value: (row) => row.jurisdiction },
  { header: "name", value: (row) => row.name },
  { header: "status", value: (row) => row.status },
  { header: "nexus_source", value: (row) => row.source },
  { header: "threshold_percent", value: (row) => row.threshold_percent },
  { header: "rule", value: (row) => row.rule },
  { header: "marketplace_sales_count", value: (row) => row.marketplace_sales_count },
  { header: "collection_start", value: (row) => row.collection_start },
  { header: "registration", value: (row) => row.registration },
]

function provenanceSource(trace: readonly ToolCallTrace[]): "live" | "fixture" | "mixed" {
  const sources = new Set(trace.map((call) => call.source))
  if (sources.size > 1) {
    return "mixed"
  }
  return sources.has("live") ? "live" : "fixture"
}

export async function GET(): Promise<Response> {
  const merchant = await requireMerchant()
  const [study, registrations] = await Promise.all([
    getNexusStudy(merchant.merchantId),
    listRegistrations(merchant.merchantId),
  ])
  if (!study.ok) {
    const status = study.code === "merchant_not_linked" ? 409 : 502
    return new Response(`Nexus study unavailable: ${study.error.message}`, {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    })
  }
  const rows = usRows(sortRows(buildRows({ study: study.data, registrations: registrations.ok ? registrations.data : null })))
  const body = toCsv(rows.map(exportRecord), COLUMNS, {
    provenance: `${provenanceLine(provenanceSource([study.trace, registrations.trace]))} Study run ${study.data.run_date ?? "pending"}.`,
  })
  const stamp = study.data.run_date ?? "pending"
  return csvResponse(`nexus-${merchant.merchantId}-${stamp}.csv`, body)
}
