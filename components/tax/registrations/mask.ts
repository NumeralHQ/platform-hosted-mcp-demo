/**
 * Account numbers are shown masked to the last four characters everywhere,
 * including the CSV export. The Reveal toggle on the page is the only place
 * the full value appears, and it is per-row and client-side.
 */
export function maskAccountNumber(value: string | null | undefined): string {
  if (!value) {
    return "—"
  }
  const compact = value.replace(/\s+/g, "")
  if (compact.length <= 4) {
    return `•••• ${compact}`
  }
  return `•••• ${compact.slice(-4)}`
}
