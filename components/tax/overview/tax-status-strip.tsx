import { CheckCircle2, CircleDashed, MapPin } from "lucide-react"
import { PanelError } from "@/components/tax/panel-error"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import type { Merchant, Panel } from "@/lib/numeral"
import type { PlatformSkin } from "@/platform.config"

/**
 * One line under the tabs: is this merchant's Numeral account connected to
 * the platform, who they are, and their home state. Fed by `get_merchant`,
 * which has no timestamps worth showing, so none are shown.
 */
export function TaxStatusStrip({ merchant, skin }: { merchant: Panel<Merchant>; skin: PlatformSkin }) {
  if (!merchant.ok) {
    return (
      <PanelError
        title="Could not load your Numeral profile"
        message={merchant.error.message}
        code={merchant.code}
      />
    )
  }
  const { data } = merchant
  const home = data.default_address
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {data.linked ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
          <CheckCircle2 className="size-3.5" />
          Numeral account connected
        </span>
      ) : (
        <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium ring-1 ring-foreground/10">
          <CircleDashed className="size-3.5" />
          Not connected
        </span>
      )}
      <span className="font-medium">{data.name}</span>
      <span className="text-muted-foreground inline-flex items-center gap-1">
        <MapPin className="size-3.5" />
        Home state {home.address_province}
        {home.address_country !== "US" ? `, ${home.address_country}` : ""}
      </span>
      <span className="text-muted-foreground text-xs">
        {skin.sellerNoun} id <span className="font-mono">{data.reference_merchant_id}</span>
      </span>
      <span className="ml-auto">
        <RecordedBadge trace={merchant.trace} />
      </span>
    </div>
  )
}
