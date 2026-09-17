import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectCard } from "@/components/tax/connect-card"
import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { UnderTheHood } from "@/components/tax/under-the-hood"
import { FilingFilterChips } from "@/components/tax/filings/filing-filter-chips"
import { FilingsHeader } from "@/components/tax/filings/filings-header"
import { FilingsTimeline } from "@/components/tax/filings/filings-timeline"
import {
  applyFilingFilters,
  filingFiltersToSearch,
  jurisdictionIdFor,
  parseFilingFilters,
  type SearchParamsInput,
} from "@/components/tax/filings/filters"
import { currentMode, currentTrace, listFilings } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

export default async function FilingsPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const merchant = await requireMerchant()
  const skin = await currentSkin()
  const filters = parseFilingFilters(await searchParams)
  const filings = await listFilings(merchant.merchantId, {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.state ? { jurisdictionId: jurisdictionIdFor(filters.state) } : {}),
  })
  const trace = await currentTrace()
  const mode = (await currentMode()).mode

  if (!filings.ok) {
    return (
      <div className="space-y-6">
        {filings.code === "merchant_not_linked" ? (
          <ConnectCard skin={skin} />
        ) : (
          <PanelError title="Filings could not be loaded" message={filings.error.message} code={filings.code} />
        )}
        <UnderTheHood trace={trace} mode={mode} />
      </div>
    )
  }

  const visible = applyFilingFilters(filings.data.filings, filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Filings</h2>
            <RecordedBadge trace={filings.trace} />
          </div>
          <p className="text-muted-foreground text-sm">
            Every return Numeral prepares and files for you. Marketplace sales through {skin.name} are remitted by{" "}
            {skin.name} and do not appear here.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href={`/api/export/filings${filingFiltersToSearch(filters)}`} />}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      <FilingsHeader filings={visible} />
      <FilingFilterChips filters={filters} filings={filings.data.filings} />
      <FilingsTimeline filings={visible} />

      <UnderTheHood trace={trace} mode={mode} />
    </div>
  )
}
