import { ConnectCard } from "@/components/tax/connect-card"
import { NexusSummaryCard } from "@/components/tax/overview/nexus-summary-card"
import { NextFilingCard } from "@/components/tax/overview/next-filing-card"
import { RegistrationsCard } from "@/components/tax/overview/registrations-card"
import { RemittanceSplitHero } from "@/components/tax/overview/remittance-split-hero"
import { TaxStatusStrip } from "@/components/tax/overview/tax-status-strip"
import { WhatChangedFeed } from "@/components/tax/overview/what-changed-feed"
import { deriveChanges } from "@/components/tax/overview/aggregate"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { UnderTheHood } from "@/components/tax/under-the-hood"
import {
  currentMode,
  currentTrace,
  getMerchant,
  getNexusStudy,
  getSalesSummary,
  listFilings,
  listRegistrations,
  trailingMonths,
  type ToolCallTrace,
} from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

const NOT_LINKED = "merchant_not_linked"

/**
 * The Tax overview. The split hero is the platform's own data and always
 * renders; the account panels need the merchant's Numeral account to be
 * connected, and collapse to one connect card when it is not.
 */
export default async function TaxOverviewPage() {
  const { merchantId } = await requireMerchant()
  const skin = await currentSkin()
  const range = trailingMonths(12)

  const [merchant, summary] = await Promise.all([getMerchant(merchantId), getSalesSummary(merchantId, range)])

  // get_merchant already told us there is nothing behind the account tools;
  // skip three calls that would each return merchant_not_linked.
  const knownUnlinked = merchant.ok && !merchant.data.linked
  const account = knownUnlinked
    ? null
    : await Promise.all([getNexusStudy(merchantId), listFilings(merchantId, { limit: 500 }), listRegistrations(merchantId)])
  const [study, filings, registrations] = account ?? [null, null, null]

  const notLinked =
    knownUnlinked || (account !== null && account.some((panel) => !panel.ok && panel.code === NOT_LINKED))

  const accountTraces: ToolCallTrace[] = (account ?? []).map((panel) => panel.trace)
  const events = notLinked
    ? []
    : deriveChanges({
        study: study?.ok ? study.data : null,
        filings: filings?.ok ? filings.data.filings : [],
        marketplaceChannel: skin.marketplaceChannel,
      })

  const trace = await currentTrace()
  const mode = await currentMode()

  return (
    <div className="space-y-6">
      <TaxStatusStrip merchant={merchant} skin={skin} />

      <RemittanceSplitHero summary={summary} range={range} skin={skin} />

      {notLinked || study === null || filings === null || registrations === null ? (
        <div className="space-y-2">
          <ConnectCard skin={skin} />
          <div className="flex justify-end">
            <RecordedBadge trace={[merchant.trace, ...accountTraces]} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <NexusSummaryCard study={study} skin={skin} />
            <NextFilingCard filings={filings} />
            <RegistrationsCard registrations={registrations} />
          </div>
          <WhatChangedFeed events={events} traces={accountTraces} />
        </>
      )}

      <UnderTheHood trace={trace} mode={mode.mode} />
    </div>
  )
}
