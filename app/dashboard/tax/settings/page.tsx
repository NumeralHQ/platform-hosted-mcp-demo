import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PanelError } from "@/components/tax/panel-error"
import { MerchantProfile } from "@/components/tax/settings/merchant-profile"
import { RemitterSetting } from "@/components/tax/settings/remitter-setting"
import { UnderTheHood } from "@/components/tax/under-the-hood"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { currentMode, currentTrace, getMerchant } from "@/lib/numeral"
import { requireMerchant } from "@/lib/session"
import { currentSkin } from "@/lib/skin"

/**
 * Tax settings: one platform-owned choice (who remits storefront tax) and
 * the merchant record the platform holds in Numeral (origin address, tax
 * ids). The connection to the merchant's own Numeral account is a separate
 * page because that consent lives in Numeral, not here.
 */
export default async function TaxSettingsPage() {
  const session = await requireMerchant()
  const skin = await currentSkin()
  const merchant = await getMerchant(session.merchantId)
  const [trace, mode] = await Promise.all([currentTrace(), currentMode()])

  return (
    <div className="space-y-6">
      <RemitterSetting skin={skin} initial="merchant" />

      {merchant.ok ? (
        <MerchantProfile skin={skin} merchant={merchant.data} trace={merchant.trace} />
      ) : (
        <PanelError title="Could not load your business details" message={merchant.error.message} code={merchant.code} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Numeral connection</CardTitle>
          <CardDescription>
            {merchant.ok && merchant.data.linked
              ? `You are sharing your Numeral account with ${skin.name}. Sharing is switched on and off in Numeral.`
              : `Share your Numeral account with ${skin.name} to see nexus, registrations, and filings here.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard/tax/connect" />} size="sm" variant="outline">
            {merchant.ok && merchant.data.linked ? "View connection" : "How to connect"} <ArrowRight className="ml-1 size-4" />
          </Button>
        </CardContent>
      </Card>

      <UnderTheHood trace={trace} mode={mode.mode} />
    </div>
  )
}
