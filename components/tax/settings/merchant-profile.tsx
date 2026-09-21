import { Hash, MapPin } from "lucide-react"
import { RecordedBadge } from "@/components/tax/recorded-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Merchant, ToolCallTrace } from "@/lib/numeral"
import type { PlatformSkin } from "@/platform.config"

/** Show only the last four characters of a tax id: "84-1234567" -> "••-•••4567". */
export function maskTaxId(value: string): string {
  const keep = 4
  let seen = 0
  let out = ""
  for (let i = value.length - 1; i >= 0; i -= 1) {
    const ch = value[i] ?? ""
    if (!/[0-9A-Za-z]/.test(ch)) {
      out = ch + out
      continue
    }
    out = (seen < keep ? ch : "•") + out
    seen += 1
  }
  return out
}

const TAX_ID_LABELS: Record<string, string> = {
  us_ein: "EIN",
}

export function taxIdLabel(type: string): string {
  return TAX_ID_LABELS[type] ?? type.replace(/_/g, " ").toUpperCase()
}

/**
 * The merchant record as the platform registered it with Numeral: the origin
 * address the platform sends on every calculation, and the tax ids it holds.
 * This is `get_merchant`, which needs no sharing consent because it is the
 * platform's own record of its merchant.
 */
export function MerchantProfile({
  skin,
  merchant,
  trace,
}: {
  skin: PlatformSkin
  merchant: Merchant
  trace: ToolCallTrace
}) {
  const address = merchant.default_address
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4" />
              <CardTitle>Origin address</CardTitle>
            </div>
            <RecordedBadge trace={trace} />
          </div>
          <CardDescription>
            Where your business ships or sells from. {skin.name} sends this on every tax calculation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <address className="text-sm not-italic leading-relaxed">
            <span className="block font-medium">{merchant.name}</span>
            <span className="block">{address.address_line_1}</span>
            {address.address_line_2 && <span className="block">{address.address_line_2}</span>}
            <span className="block">
              {address.address_city}, {address.address_province} {address.address_postal_code}
            </span>
            <span className="text-muted-foreground block">{address.address_country}</span>
          </address>
          <p className="text-muted-foreground mt-3 text-xs">
            To change it, update your business address in {skin.name} account settings.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Hash className="size-4" />
              <CardTitle>Tax IDs</CardTitle>
            </div>
            <RecordedBadge trace={trace} />
          </div>
          <CardDescription>Shown masked. {skin.name} uses them when it registers or files on your behalf.</CardDescription>
        </CardHeader>
        <CardContent>
          {merchant.tax_ids.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tax ids on file.</p>
          ) : (
            <dl className="space-y-2">
              {merchant.tax_ids.map((taxId) => (
                <div key={`${taxId.type}-${taxId.value}`} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{taxIdLabel(taxId.type)}</dt>
                  <dd className="font-mono tabular-nums">{maskTaxId(taxId.value)}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Reference id in {skin.name}: <span className="font-mono">{merchant.reference_merchant_id}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
