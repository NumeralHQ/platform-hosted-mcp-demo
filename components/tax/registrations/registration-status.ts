/**
 * Plain-language labels and buckets for the registration `status` literals
 * the Numeral MCP returns. The literal itself is always shown in a tooltip so
 * an engineer can map what they see back to the API response.
 */
export type RegistrationBucket =
  | "registered"
  | "in_progress"
  | "not_registered"
  | "closed"
  | "managed_elsewhere"

export const REGISTRATION_BUCKET_ORDER: readonly RegistrationBucket[] = [
  "registered",
  "in_progress",
  "not_registered",
  "closed",
  "managed_elsewhere",
]

export const REGISTRATION_BUCKET_LABELS: Record<RegistrationBucket, string> = {
  registered: "Registered",
  in_progress: "In progress",
  not_registered: "Not registered",
  closed: "Closed",
  managed_elsewhere: "Managed elsewhere",
}

export const REGISTRATION_BUCKET_DESCRIPTIONS: Record<RegistrationBucket, string> = {
  registered: "You hold an active sales tax account in these states.",
  in_progress: "Numeral is working through the registration. Nothing is needed from you unless the status says so.",
  not_registered: "No registration exists for these states.",
  closed: "Accounts that have been closed or are being closed.",
  managed_elsewhere: "Registrations Numeral tracks but does not manage.",
}

const STATUS_LABELS: Record<string, string> = {
  onboarding: "Getting started",
  ops_review: "Under review by Numeral",
  fully_transferred: "Registered (transferred to Numeral)",
  externally_managed: "Managed outside Numeral",
  do_not_transfer: "Kept with your existing provider",
  unregistered: "Not registered",
  waiting_for_mail: "Waiting for mail from the state",
  documents_received: "Documents received",
  online_account_created: "Registered (online account created)",
  complete: "Registered",
  incomplete: "Needs more information",
  ready_to_file: "Registered (ready to file)",
  in_progress: "In progress",
  has_problems: "Needs attention",
  pending_2fa: "Waiting on two-factor code",
  new_closure_request: "Closure requested",
  waiting_for_confirmation: "Closure pending confirmation",
  account_closed: "Account closed",
}

export function registrationStatusLabel(status: string | null): string {
  if (!status) {
    return "Unknown"
  }
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

export function registrationBucket(status: string | null): RegistrationBucket {
  switch (status) {
    case "online_account_created":
    case "fully_transferred":
    case "complete":
    case "ready_to_file":
      return "registered"
    case "onboarding":
    case "in_progress":
    case "ops_review":
    case "waiting_for_mail":
    case "documents_received":
    case "incomplete":
    case "pending_2fa":
    case "has_problems":
      return "in_progress"
    case "unregistered":
      return "not_registered"
    case "account_closed":
    case "new_closure_request":
    case "waiting_for_confirmation":
      return "closed"
    default:
      return "managed_elsewhere"
  }
}

/** Statuses where the merchant may actually have to do something. */
export function registrationNeedsAttention(status: string | null): boolean {
  return status === "has_problems" || status === "incomplete" || status === "pending_2fa"
}
