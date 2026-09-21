import { ConnectSteps } from "@/components/tax/connect/connect-steps"
import { ConnectedState } from "@/components/tax/connect/connected-state"
import { WhatPlatformSees, WorksWithoutConnecting } from "@/components/tax/connect/visibility-cards"
import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { UnderTheHood } from "@/components/tax/under-the-hood"
import { currentMode, currentTrace, getMerchant } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

/**
 * The "not connected" storyboard. One Numeral call (get_merchant) decides
 * which of two stories to tell: already sharing, or how to start.
 */
export default async function ConnectPage() {
  const session = await requireMerchant()
  const skin = await currentSkin()
  const merchant = await getMerchant(session.merchantId)
  const [trace, mode] = await Promise.all([currentTrace(), currentMode()])

  const linked = merchant.ok && merchant.data.linked

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {linked ? `Your Numeral account is connected to ${skin.name}` : `Bring your Numeral account into ${skin.name}`}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {linked
              ? `Sharing is a switch in Numeral. You turned it on; you can turn it off there at any time.`
              : `Your filings, nexus position, and registrations live in Numeral. Share them with ${skin.name} and they show up on this tab. You decide, in Numeral, and you can stop at any time.`}
          </p>
        </div>
        <RecordedBadge trace={merchant.trace} />
      </div>

      {!merchant.ok && (
        <PanelError
          title="Could not read your connection status"
          message={merchant.error.message}
          code={merchant.code}
        />
      )}

      {linked ? (
        <ConnectedState skin={skin} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <ConnectSteps skin={skin} merchant={merchant.ok ? merchant.data : null} />
          <div className="space-y-6">
            <WhatPlatformSees skin={skin} />
            <WorksWithoutConnecting skin={skin} />
          </div>
        </div>
      )}

      <UnderTheHood trace={trace} mode={mode.mode} />
    </div>
  )
}
