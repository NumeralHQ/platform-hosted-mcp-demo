import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { humanize } from "@/lib/format"
import type { ListRegistrations, Panel } from "@/lib/numeral"
import { stateOf, summarizeRegistrations } from "./aggregate"
import { TabLink } from "./tab-link"

/** Which states the merchant is registered in and which are still being set up. */
export function RegistrationsCard({ registrations }: { registrations: Panel<ListRegistrations> }) {
  if (!registrations.ok) {
    return (
      <PanelError
        title="Could not load your registrations"
        message={registrations.error.message}
        code={registrations.code}
      />
    )
  }

  const summary = summarizeRegistrations(registrations.data.registrations)
  const total = registrations.data.registrations.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Registrations</CardTitle>
            <CardDescription>
              {total === 0 ? "No registrations yet" : `${total} ${total === 1 ? "state" : "states"}`}
            </CardDescription>
          </div>
          <RecordedBadge trace={registrations.trace} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2.5">
            <dd className="text-xl font-semibold tabular-nums">{summary.registered.length}</dd>
            <dt className="text-muted-foreground text-xs">Registered</dt>
          </div>
          <div className="rounded-lg border p-2.5">
            <dd className="text-xl font-semibold tabular-nums text-amber-700">{summary.inProgress.length}</dd>
            <dt className="text-muted-foreground text-xs">In progress</dt>
          </div>
        </dl>

        {total > 0 ? (
          <div className="space-y-2 text-sm">
            {summary.registered.length > 0 ? (
              <StateRow label="Registered">
                {summary.registered.map((registration) => (
                  <Badge key={registration.id} variant="secondary" title={humanize(registration.status)}>
                    {stateOf(registration)}
                  </Badge>
                ))}
              </StateRow>
            ) : null}
            {summary.inProgress.length > 0 ? (
              <StateRow label="In progress">
                {summary.inProgress.map((registration) => (
                  <Badge key={registration.id} variant="outline" title={humanize(registration.status)}>
                    {stateOf(registration)}
                  </Badge>
                ))}
              </StateRow>
            ) : null}
            {summary.other.length > 0 ? (
              <StateRow label="Other">
                {summary.other.map((registration) => (
                  <Badge key={registration.id} variant="outline" title={humanize(registration.status)}>
                    {stateOf(registration)}
                  </Badge>
                ))}
              </StateRow>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Registrations will appear here once Numeral starts one.</p>
        )}
      </CardContent>
      <CardFooter>
        <TabLink href="/dashboard/tax/registrations">All registrations</TabLink>
      </CardFooter>
    </Card>
  )
}

function StateRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
      {children}
    </div>
  )
}
