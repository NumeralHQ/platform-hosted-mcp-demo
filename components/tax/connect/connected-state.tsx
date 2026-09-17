import Link from "next/link"
import { ArrowRight, CircleCheck, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformSkin } from "@/platform.config"
import { NUMERAL_APP_URL } from "./connect-steps"

/** The linked merchant's view: confirmation plus how to stop sharing (in Numeral, not here). */
export function ConnectedState({ skin }: { skin: PlatformSkin }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader>
        <div className="flex items-center gap-2 text-emerald-800">
          <CircleCheck className="size-5" />
          <CardTitle className="text-emerald-900">Connected</CardTitle>
        </div>
        <CardDescription className="text-emerald-900/80">
          You are sharing your Numeral account with {skin.name}. Your nexus, registrations, and filings are
          showing on this tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-white p-4 text-sm">
          <p className="font-medium">To stop sharing</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            Sharing is controlled from your Numeral account, not from {skin.name}. Open Numeral, go to{" "}
            <span className="font-medium">Connections</span>, and switch off{" "}
            <span className="font-medium">&ldquo;Share with {skin.name}&rdquo;</span>. This tab goes back to the
            connect prompt on its next load; {skin.name} keeps no copy of the shared data.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/dashboard/tax" />} size="sm">
            Back to Tax <ArrowRight className="ml-1 size-4" />
          </Button>
          <Button render={<a href={NUMERAL_APP_URL} target="_blank" rel="noreferrer" />} size="sm" variant="outline">
            Open Numeral <ExternalLink className="ml-1 size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
