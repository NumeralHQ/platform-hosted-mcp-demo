import { cookies } from "next/headers"
import { KeyRound, Terminal } from "lucide-react"
import { ChoiceForm } from "@/components/admin/choice-form"
import { SimulateSwitch } from "@/components/admin/simulate-switch"
import { StatusRow } from "@/components/admin/status-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { currentMode } from "@/lib/numeral"
import { hasKey, mcpUrl } from "@/lib/numeral/client"
import { DEFAULT_SCENARIO, SCENARIOS } from "@/lib/numeral/data-source"
import { currentSkin } from "@/lib/skin"
import { SKINS } from "@/platform.config"
import { rememberAdmin, resetDemoCookies, setMode, setScenario, setSimulateUnlinked, setSkin } from "./actions"
import { hasAdminCookie, tokenMatches } from "./admin-auth"

const MODE_CHOICES = [
  { value: "live", label: "Live", hint: "Every panel calls the Numeral MCP" },
  { value: "replay", label: "Replay", hint: "Every panel reads fixtures/<scenario>" },
  { value: "auto", label: "Auto", hint: "Live, with per-panel fixture fallback" },
  { value: "clear", label: "Use NUMERAL_MODE", hint: "Remove the override cookie" },
] as const

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  const viaToken = tokenMatches(params.token)
  const viaCookie = await hasAdminCookie()
  if (!viaToken && !viaCookie) {
    return <Locked wrongToken={params.token !== undefined} />
  }
  // Until the actions have set the admin cookie, every form carries the token along.
  const token = viaCookie ? null : (params.token ?? null)

  const jar = await cookies()
  const [mode, skin] = await Promise.all([currentMode(), currentSkin()])
  const modeCookie = jar.get("demo_mode")?.value ?? null
  const scenarioCookie = jar.get("demo_scenario")?.value ?? null
  const skinCookie = jar.get("demo_skin")?.value ?? null
  const envMode = process.env.NUMERAL_MODE?.trim() || "(unset)"

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Demo controls</h1>
          <p className="text-muted-foreground text-sm">
            Each control sets a cookie in this browser only. Nothing here changes the deployment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {token !== null && (
            <form action={rememberAdmin}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit" variant="secondary" size="sm">
                Remember this browser
              </Button>
            </form>
          )}
          <form action={resetDemoCookies}>
            {token !== null && <input type="hidden" name="token" value={token} />}
            <Button type="submit" variant="outline" size="sm">
              Reset demo cookies
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data mode</CardTitle>
            <CardDescription>
              Overrides <span className="font-mono">NUMERAL_MODE</span> (currently{" "}
              <span className="font-mono">{envMode}</span>). Effective mode:{" "}
              <span className="font-mono">{mode.mode}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChoiceForm name="mode" choices={MODE_CHOICES} active={modeCookie ?? "clear"} token={token} action={setMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario</CardTitle>
            <CardDescription>
              Which <span className="font-mono">fixtures/</span> folder answers replayed or fallback calls. Folders
              only override what differs from <span className="font-mono">{DEFAULT_SCENARIO}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChoiceForm
              name="scenario"
              choices={SCENARIOS.map((s) => ({ value: s, label: s }))}
              active={scenarioCookie ?? DEFAULT_SCENARIO}
              token={token}
              action={setScenario}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulate not connected</CardTitle>
            <CardDescription>
              Answers the merchant and account tools from the <span className="font-mono">unlinked</span> fixtures
              so the Tax tab shows the connect card, even when the live merchant is linked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimulateSwitch checked={mode.simulateUnlinked} token={token} onChangeAction={setSimulateUnlinked} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform skin</CardTitle>
            <CardDescription>
              Overrides <span className="font-mono">PLATFORM_SKIN</span>. Showing{" "}
              <span className="font-medium">{skin.name}</span>: {skin.tagline}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChoiceForm
              name="skin"
              choices={Object.values(SKINS).map((s) => ({ value: s.slug, label: s.name, hint: s.tagline }))}
              active={skinCookie ?? skin.slug}
              token={token}
              action={setSkin}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Read-only. What this request resolved to.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <StatusRow label="Effective mode" value={mode.mode} mono />
            <StatusRow label="Scenario" value={mode.scenario} mono />
            <StatusRow label="Simulate not connected" value={mode.simulateUnlinked ? "on" : "off"} />
            <StatusRow label="Skin" value={`${skin.name} (${skin.slug})`} />
            <StatusRow label="MCP URL" value={mcpUrl()} mono />
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-muted-foreground text-sm">Keys configured</dt>
              <dd className="flex gap-2">
                <KeyBadge label="NUMERAL_TEST_API_KEY" present={hasKey("test")} />
                <KeyBadge label="NUMERAL_LIVE_API_KEY" present={hasKey("live")} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="size-4" />
            <CardTitle>Record fixtures</CardTitle>
          </div>
          <CardDescription>
            Recording runs from a terminal with the platform keys in the shell, never from this page. It writes
            redacted responses to <span className="font-mono">fixtures/&lt;scenario&gt;/</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed">
            {`# from the repo root, with NUMERAL_TEST_API_KEY / NUMERAL_LIVE_API_KEY in .env.local or the shell
bun run record                                      # scenario ridgeline-linked, merchant ridgeline-trading
bun run record -- --scenario unlinked --merchant ridgeline-trading`}
          </pre>
          <p className="text-muted-foreground text-sm">
            Merchant emails and street addresses are replaced before anything is written. Commit the resulting
            files so replay mode works on a fresh clone.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

function KeyBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <Badge variant={present ? "secondary" : "outline"} className="font-mono text-[11px]">
      {present ? "set" : "unset"} · {label}
    </Badge>
  )
}

function Locked({ wrongToken }: { wrongToken: boolean }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4" />
            <CardTitle>Demo controls</CardTitle>
          </div>
          <CardDescription>
            Enter the <span className="font-mono">ADMIN_TOKEN</span> for this deployment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input id="token" name="token" type="password" autoComplete="off" required aria-invalid={wrongToken || undefined} />
              {wrongToken && <p className="text-destructive text-xs">That token did not match.</p>}
            </div>
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
