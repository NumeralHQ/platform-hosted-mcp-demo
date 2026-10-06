import type { Registration } from "@/lib/numeral"
import { formatDate } from "@/lib/format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HeaderHint } from "./header-hint"
import { MaskedAccountNumber } from "./masked-account-number"
import { RegistrationStatusBadge } from "./registration-status-badge"
import type { FilingCadence } from "./cadence"
import {
  REGISTRATION_BUCKET_DESCRIPTIONS,
  REGISTRATION_BUCKET_LABELS,
  REGISTRATION_BUCKET_ORDER,
  registrationBucket,
  type RegistrationBucket,
} from "./registration-status"

export interface RegistrationGroup {
  bucket: RegistrationBucket
  registrations: Registration[]
}

export function groupRegistrations(registrations: readonly Registration[]): RegistrationGroup[] {
  const groups = new Map<RegistrationBucket, Registration[]>()
  for (const registration of registrations) {
    const bucket = registrationBucket(registration.status)
    const list = groups.get(bucket) ?? []
    list.push(registration)
    groups.set(bucket, list)
  }
  const result: RegistrationGroup[] = []
  for (const bucket of REGISTRATION_BUCKET_ORDER) {
    const list = groups.get(bucket)
    if (list && list.length > 0) {
      result.push({
        bucket,
        registrations: [...list].sort((a, b) => (a.state_code ?? a.jurisdiction_id).localeCompare(b.state_code ?? b.jurisdiction_id)),
      })
    }
  }
  return result
}

export function RegistrationsTable({
  registrations,
  cadence,
}: {
  registrations: readonly Registration[]
  /** jurisdiction_id → inferred cadence; undefined when filings could not be read. */
  cadence: Map<string, FilingCadence> | undefined
}) {
  const groups = groupRegistrations(registrations)
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No registrations on file yet.
      </p>
    )
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.bucket} aria-labelledby={`registrations-${group.bucket}`}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 id={`registrations-${group.bucket}`} className="text-sm font-medium">
              {REGISTRATION_BUCKET_LABELS[group.bucket]}
            </h3>
            <span className="text-muted-foreground text-xs tabular-nums">{group.registrations.length}</span>
            <span className="text-muted-foreground hidden text-xs sm:inline">
              · {REGISTRATION_BUCKET_DESCRIPTIONS[group.bucket]}
            </span>
          </div>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account number</TableHead>
                  <TableHead>
                    <HeaderHint
                      label="Filing cadence"
                      hint="Based on recent returns. Numeral does not expose the state's assigned frequency here yet."
                    />
                  </TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead className="pr-4">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="pl-4 font-medium">
                      {registration.state_code ?? registration.jurisdiction_id}
                      <span className="text-muted-foreground ml-2 font-mono text-xs">{registration.jurisdiction_id}</span>
                    </TableCell>
                    <TableCell>
                      <RegistrationStatusBadge status={registration.status} />
                    </TableCell>
                    <TableCell>
                      <MaskedAccountNumber value={registration.account_number} />
                    </TableCell>
                    <TableCell>
                      {cadence === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        cadence.get(registration.jurisdiction_id) ?? (
                          <span className="text-muted-foreground">No returns yet</span>
                        )
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(registration.start_date_on)}</TableCell>
                    <TableCell className="pr-4 tabular-nums">{formatDate(registration.completed_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  )
}
