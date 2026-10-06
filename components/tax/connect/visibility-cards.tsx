import { CircleCheck, Eye, ShieldCheck, Store, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformSkin } from "@/platform.config"

/** What sharing does and does not expose, in the merchant's words. */
export function WhatPlatformSees({ skin }: { skin: PlatformSkin }) {
  const shared = [
    "Your nexus study: which states you have crossed a threshold in, and how close you are elsewhere",
    "Your sales tax registrations, with account numbers masked in this dashboard",
    "Your filings: period, due date, status, and the amounts on each return",
  ]
  const never = ["Your Numeral login or password", "Your account credentials or payment details held by Numeral"]
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="size-4" />
          <CardTitle>What {skin.name} can see</CardTitle>
        </div>
        <CardDescription>Read-only, and only while sharing is switched on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {shared.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="size-4" /> Never shared
          </p>
          <ul className="space-y-2">
            {never.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <X className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export function WorksWithoutConnecting({ skin }: { skin: PlatformSkin }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="size-4" />
          <CardTitle>What still works without connecting</CardTitle>
        </div>
        <CardDescription>The Sales tab is {skin.name}&apos;s own data and never needs your consent.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-2 text-sm leading-relaxed">
        <p>
          Every sale through {skin.marketplaceChannel} and {skin.storefrontChannel.toLowerCase()} is recorded by{" "}
          {skin.name}, so the sales split by state and by who remits the tax stays available. That is {skin.name}
          reporting on transactions it processed for you.
        </p>
        <p>
          Nexus, registrations, and filings live in your Numeral account. They appear here only after you share
          them.
        </p>
      </CardContent>
    </Card>
  )
}
