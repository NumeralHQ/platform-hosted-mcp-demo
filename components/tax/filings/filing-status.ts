import { FILING_STATUSES } from "@/lib/numeral/schemas"

/**
 * Plain-language labels and buckets for the filing `status` literals. The
 * literal is always available in a tooltip; the label is what a merchant
 * reads. Anything the MCP adds later lands in "Due soon" as "In progress".
 */
export type FilingBucket = "due_soon" | "needs_attention" | "filed" | "canceled"

export const FILING_BUCKET_ORDER: readonly FilingBucket[] = [
  "due_soon",
  "needs_attention",
  "filed",
  "canceled",
]

export const FILING_BUCKET_LABELS: Record<FilingBucket, string> = {
  due_soon: "Due soon",
  needs_attention: "Needs attention",
  filed: "Filed",
  canceled: "Canceled",
}

export const FILING_BUCKET_DESCRIPTIONS: Record<FilingBucket, string> = {
  due_soon: "Returns Numeral is preparing or has queued for the next due date.",
  needs_attention: "Returns that were sent back and need a decision.",
  filed: "Returns Numeral has submitted to the state.",
  canceled: "Returns that were withdrawn and will not be filed.",
}

const STATUS_LABELS: Record<string, string> = {
  unfiled: "Not started",
  in_progress: "Being prepared",
  pending_admin_approval: "Under review by Numeral",
  pending_client_approval: "Waiting for your approval",
  client_approved: "Approved, queued to file",
  filed: "Filed",
  client_rejected: "You sent it back",
  admin_rejected: "Numeral sent it back",
  has_problems: "Needs attention",
  canceled: "Canceled",
  on_hold: "On hold",
  transmitting: "Being sent to the state",
  pending_ack: "Waiting for the state to acknowledge",
  pending_payment: "Payment scheduled",
  pni_portal_review: "Numeral is reviewing a state notice",
  pending_payment_ack: "Waiting for payment confirmation",
}

export function filingStatusLabel(status: string | null): string {
  if (!status) {
    return "In progress"
  }
  return STATUS_LABELS[status] ?? "In progress"
}

export function filingBucket(status: string | null): FilingBucket {
  switch (status) {
    case "filed":
      return "filed"
    case "has_problems":
    case "client_rejected":
    case "admin_rejected":
      return "needs_attention"
    case "canceled":
      return "canceled"
    default:
      return "due_soon"
  }
}

export type FilingStatusLiteral = (typeof FILING_STATUSES)[number]

export function isFilingStatus(value: string): value is FilingStatusLiteral {
  return (FILING_STATUSES as readonly string[]).includes(value)
}
