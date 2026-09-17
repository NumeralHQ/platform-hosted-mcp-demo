"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformSkin } from "@/platform.config"
import { cn } from "@/lib/utils"

type Remitter = "platform" | "merchant"

/**
 * The platform's own setting: who remits tax on the merchant's storefront
 * sales. It is what makes the Sales tab show two remitters. Local state only;
 * a real platform would persist it on the merchant record and pass the
 * resulting role on every transaction it sends to Numeral.
 */
export function RemitterSetting({ skin, initial }: { skin: PlatformSkin; initial: Remitter }) {
  const [value, setValue] = useState<Remitter>(initial)
  // "Your storefront" -> "your storefront"; "Direct orders" -> "direct orders".
  const storefront = skin.storefrontChannel.toLowerCase()
  const options: Array<{ value: Remitter; title: string; body: string }> = [
    {
      value: "platform",
      title: `${skin.name} collects and remits for me`,
      body: `${skin.name} calculates, collects, and files the tax on every sale through ${storefront}, the same way it already does for ${skin.marketplaceChannel}.`,
    },
    {
      value: "merchant",
      title: `${skin.name} collects, I remit`,
      body: `${skin.name} calculates and collects tax at checkout and pays it out to you. You file and remit it yourself, or through your own tax provider.`,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Who collects and remits tax on sales through {storefront}?</CardTitle>
          <Badge variant="outline" className="font-normal">
            {skin.name} setting
          </Badge>
        </div>
        <CardDescription>
          Sales through {skin.marketplaceChannel} are always remitted by {skin.name} as marketplace facilitator.
          This choice covers sales through {storefront} only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="sr-only">Remitter for storefront sales</legend>
          {options.map((option) => {
            const selected = option.value === value
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  selected ? "border-foreground bg-muted/40" : "hover:bg-muted/30"
                )}
              >
                <input
                  type="radio"
                  name="remitter"
                  value={option.value}
                  checked={selected}
                  onChange={() => setValue(option.value)}
                  className="accent-foreground mt-1 size-4"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="text-muted-foreground block text-sm leading-relaxed">{option.body}</span>
                </span>
              </label>
            )
          })}
        </fieldset>
        <div className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed p-3 text-xs leading-relaxed">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Saved in this demo only. Because this account is on &ldquo;{skin.name} collects, I remit&rdquo;, the
            Sales tab splits tax into <span className="font-medium">{skin.liability.platformRemits}</span> (
            {skin.marketplaceChannel}) and <span className="font-medium">{skin.liability.merchantRemits}</span> (
            {storefront}).
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
