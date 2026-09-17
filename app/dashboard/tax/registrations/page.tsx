import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectCard } from "@/components/tax/connect-card"
import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { UnderTheHood } from "@/components/tax/under-the-hood"
import { inferCadence } from "@/components/tax/registrations/cadence"
import { RegisterHereHint, unregisteredWatchlist } from "@/components/tax/registrations/register-here-hint"
import { RegistrationsTable } from "@/components/tax/registrations/registrations-table"
import { currentMode, currentTrace, getNexusStudy, listFilings, listRegistrations } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

export default async function RegistrationsPage() {
  const merchant = await requireMerchant()
  const skin = await currentSkin()
  const [registrations, filings, nexus] = await Promise.all([
    listRegistrations(merchant.merchantId),
    listFilings(merchant.merchantId),
    getNexusStudy(merchant.merchantId),
  ])
  const trace = await currentTrace()
  const mode = (await currentMode()).mode

  if (!registrations.ok) {
    return (
      <div className="space-y-6">
        {registrations.code === "merchant_not_linked" ? (
          <ConnectCard skin={skin} />
        ) : (
          <PanelError title="Registrations could not be loaded" message={registrations.error.message} code={registrations.code} />
        )}
        <UnderTheHood trace={trace} mode={mode} />
      </div>
    )
  }

  const rows = registrations.data.registrations
  const cadence = filings.ok ? inferCadence(filings.data.filings) : undefined
  const watchlist = nexus.ok ? unregisteredWatchlist(nexus.data.jurisdictions, rows) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Registrations</h2>
            <RecordedBadge trace={registrations.trace} />
          </div>
          <p className="text-muted-foreground text-sm">
            Your sales tax accounts, as Numeral holds them. {skin.name} remits marketplace sales for you; these
            registrations cover what you remit yourself.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href="/api/export/registrations" />}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      <RegistrationsTable registrations={rows} cadence={cadence} />

      {!filings.ok && filings.code !== "merchant_not_linked" ? (
        <PanelError title="Filing cadence unavailable" message={filings.error.message} code={filings.code} />
      ) : null}

      {nexus.ok ? (
        <RegisterHereHint watchlist={watchlist} />
      ) : nexus.code !== "merchant_not_linked" ? (
        <PanelError title="Nexus watchlist unavailable" message={nexus.error.message} code={nexus.code} />
      ) : null}

      <UnderTheHood trace={trace} mode={mode} />
    </div>
  )
}
