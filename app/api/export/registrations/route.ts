import { maskAccountNumber } from "@/components/tax/registrations/mask"
import {
  REGISTRATION_BUCKET_LABELS,
  registrationBucket,
  registrationStatusLabel,
} from "@/components/tax/registrations/registration-status"
import { csvResponse, provenanceLine, toCsv, type CsvColumn } from "@/lib/csv"
import { formatDate } from "@/lib/format"
import { listRegistrations, type Registration } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"

const COLUMNS: readonly CsvColumn<Registration>[] = [
  { header: "State", value: (row) => row.state_code ?? row.jurisdiction_id },
  { header: "Jurisdiction", value: (row) => row.jurisdiction_id },
  { header: "Status", value: (row) => registrationStatusLabel(row.status) },
  { header: "Status code", value: (row) => row.status },
  { header: "Bucket", value: (row) => REGISTRATION_BUCKET_LABELS[registrationBucket(row.status)] },
  { header: "Account number (last 4)", value: (row) => (row.account_number ? maskAccountNumber(row.account_number) : "") },
  { header: "Start date", value: (row) => (row.start_date_on ? formatDate(row.start_date_on, "yyyy-MM-dd") : "") },
  { header: "Completed", value: (row) => (row.completed_at ? formatDate(row.completed_at, "yyyy-MM-dd") : "") },
]

/** The Registrations table as CSV. Account numbers stay masked to the last four. */
export async function GET(): Promise<Response> {
  const merchant = await requireMerchant()
  const registrations = await listRegistrations(merchant.merchantId)
  if (!registrations.ok) {
    return Response.json(
      { error: registrations.code ?? "error", message: registrations.error.message },
      { status: registrations.code === "merchant_not_linked" ? 409 : 502 }
    )
  }
  const body = toCsv(registrations.data.registrations, COLUMNS, {
    provenance: provenanceLine(registrations.trace.source === "fixture" ? "fixture" : "live"),
  })
  return csvResponse(`${merchant.merchantId}-registrations.csv`, body)
}
