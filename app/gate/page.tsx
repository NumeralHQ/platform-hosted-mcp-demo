import { Lock } from "lucide-react"
import { PlatformMark } from "@/components/shell/platform-mark"
import { PoweredBy } from "@/components/shell/powered-by"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { currentSkin } from "@/lib/skin"
import { unlockGate } from "./actions"
import { safeNextPath } from "./gate-cookie"

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const [skin, params] = await Promise.all([currentSkin(), searchParams])
  const next = safeNextPath(params.next)
  const failed = params.error === "1"

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <PlatformMark skin={skin} size="lg" />
          <h1 className="text-2xl font-semibold tracking-tight">This demo is private</h1>
          <p className="text-muted-foreground text-sm">Enter the passcode you were given to continue.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="size-4" />
              <CardTitle>Passcode</CardTitle>
            </div>
            <CardDescription>Stays unlocked in this browser for 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={unlockGate} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div className="space-y-2">
                <Label htmlFor="passcode">Passcode</Label>
                <Input
                  id="passcode"
                  name="passcode"
                  type="password"
                  autoComplete="off"
                  autoFocus
                  required
                  aria-invalid={failed || undefined}
                />
                {failed && <p className="text-destructive text-xs">That passcode did not match. Try again.</p>}
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>

        <PoweredBy />
      </div>
    </main>
  )
}
