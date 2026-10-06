import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatMinorUsd } from "@/lib/format"
import type { Balance } from "@/lib/home/platform-data"

/** Available and pending balance with the next scheduled payout and the last few paid. */
export function BalanceCard({ balance, platformName }: { balance: Balance; platformName: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Balance</CardTitle>
        <CardDescription>Paid out every Tuesday by {platformName}.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
            Payouts
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div>
          <p className="text-muted-foreground text-xs">Available</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatMinorUsd(balance.available)}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatMinorUsd(balance.pending)} pending · next payout {formatDate(balance.next.on, "ccc, LLL d")}
          </p>
        </div>
        <div className="mt-auto space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Recent payouts</p>
          <ul className="space-y-1.5 text-sm">
            {balance.recent.map((payout) => (
              <li key={payout.on} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{formatDate(payout.on)}</span>
                <span className="font-medium tabular-nums">{formatMinorUsd(payout.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
