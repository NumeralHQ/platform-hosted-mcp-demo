import type { NextRequest } from "next/server"
import { FILING_BUCKET_LABELS, filingBucket, filingStatusLabel } from "@/components/tax/filings/filing-status"
import {
  applyFilingFilters,
  jurisdictionIdFor,
  parseFilingFilters,
  type SearchParamsInput,
} from "@/components/tax/filings/filters"
import { csvResponse, provenanceLine, toCsv, type CsvColumn } from "@/lib/csv"
import { formatDate, formatPeriod } from "@/lib/format"
import { listFilings, type FilingSummary } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"

const isoDay = (iso: string | null): string => (iso ? formatDate(iso, "yyyy-MM-dd") : "")
const dollars = (value: number): string => value.toFixed(2)

const COLUMNS: readonly CsvColumn<FilingSummary>[] = [
  { header: "Filing id", value: (row) => row.id },
  { header: "State", value: (row) => row.state ?? row.jurisdiction_id },
  { header: "Jurisdiction", value: (row) => row.jurisdiction_id },
  { header: "Period", value: (row) => formatPeriod(row.period_starts_at, row.period_ends_at) },
  { header: "Period start", value: (row) => isoDay(row.period_starts_at) },
  { header: "Period end", value: (row) => isoDay(row.period_ends_at) },
  { header: "Status", value: (row) => filingStatusLabel(row.status) },
  { header: "Status code", value: (row) => row.status },
  { header: "Bucket", value: (row) => FILING_BUCKET_LABELS[filingBucket(row.status)] },
  { header: "Due", value: (row) => isoDay(row.due_on) },
  { header: "Filed", value: (row) => isoDay(row.filed_at) },
  { header: "Taxable sales (USD)", value: (row) => dollars(row.taxable_sales) },
  { header: "Non-taxable sales (USD)", value: (row) => dollars(row.non_taxable_sales) },
  { header: "Tax collected (USD)", value: (row) => dollars(row.tax_collected) },
  { header: "Penalty (USD)", value: (row) => dollars(row.penalty_amount) },
  { header: "Interest (USD)", value: (row) => dollars(row.interest_amount) },
]

function searchParamsInput(request: NextRequest): SearchParamsInput {
  const input: SearchParamsInput = {}
  for (const [key, value] of request.nextUrl.searchParams) {
    input[key] = value
  }
  return input
}

/** The Filings table as CSV, honoring the same ?status=&year=&state= filters as the page. */
export async function GET(request: NextRequest): Promise<Response> {
  const merchant = await requireMerchant()
  const filters = parseFilingFilters(searchParamsInput(request))
  const filings = await listFilings(merchant.merchantId, {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.state ? { jurisdictionId: jurisdictionIdFor(filters.state) } : {}),
  })
  if (!filings.ok) {
    return Response.json(
      { error: filings.code ?? "error", message: filings.error.message },
      { status: filings.code === "merchant_not_linked" ? 409 : 502 }
    )
  }
  const visible = applyFilingFilters(filings.data.filings, filters)
  const body = toCsv(visible, COLUMNS, {
    provenance: provenanceLine(filings.trace.source === "fixture" ? "fixture" : "live"),
  })
  const suffix = [filters.state, filters.year, filters.status].filter(Boolean).join("-")
  return csvResponse(`${merchant.merchantId}-filings${suffix ? `-${suffix}` : ""}.csv`, body)
}
