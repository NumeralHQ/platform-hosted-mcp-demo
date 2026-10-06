"use client"

import { useState } from "react"
import { Code2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { ToolCallTrace } from "@/lib/numeral"

/**
 * The engineer's view of the page: every Numeral MCP call that produced it,
 * with the tool, the arguments (merchant_id highlighted because it is the
 * one thing the platform injects), which key answered it, latency, the scope
 * the server reported, and whether a recorded fixture stood in.
 *
 * Render it once per page, after the data calls, with `trace` from
 * `currentTrace()`.
 */
export function UnderTheHood({ trace, mode }: { trace: ToolCallTrace[]; mode: string }) {
  const [open, setOpen] = useState(false)
  const live = trace.filter((t) => t.source === "live").length
  const recorded = trace.length - live
  const totalMs = trace.reduce((sum, t) => sum + t.durationMs, 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="fixed right-6 bottom-6 z-40 shadow-md" />
        }
      >
        <Code2 className="mr-1.5 size-4" />
        Under the hood
        <Badge variant="secondary" className="ml-2 tabular-nums">
          {trace.length}
        </Badge>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-base font-semibold">Numeral MCP calls on this page</SheetTitle>
          <SheetDescription className="tabular-nums">
            {trace.length} {trace.length === 1 ? "call" : "calls"} · {live} live · {recorded} recorded · {totalMs} ms ·
            mode <span className="font-mono text-foreground">{mode}</span>
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <ol className="divide-y">
            {trace.map((call, index) => (
              <li key={`${call.tool}-${index}`} className="space-y-3 px-6 py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate font-mono text-sm font-semibold">{call.tool}</span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{call.durationMs} ms</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {call.source === "live" ? (
                    <Badge variant="secondary">live · {call.keyKind === "live" ? "sk_prod" : "sk_test"}</Badge>
                  ) : (
                    <Badge variant="outline">recorded{call.fallbackReason ? ` · ${call.fallbackReason}` : ""}</Badge>
                  )}
                  {call.scope && <Badge variant="outline">scope · {call.scope}</Badge>}
                  {call.errorCode && <Badge variant="destructive">{call.errorCode}</Badge>}
                </div>
                <pre className="bg-muted overflow-x-auto rounded-lg px-4 py-3 font-mono text-xs leading-relaxed">
                  <Args args={call.args} />
                </pre>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground border-t px-6 py-5 text-xs leading-relaxed">
            Each call is one stateless POST to{" "}
            <span className="font-mono text-foreground">https://mcp.numeralhq.com/mcp</span> with the
            platform&apos;s secret key as a Bearer token. The key decides the account and the mode, so tools never
            take an account id. <span className="font-mono text-foreground">merchant_id</span> is the only thing
            this app injects, and it comes from the signed-in session, never from the browser.
          </p>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function Args({ args }: { args: Record<string, unknown> }) {
  const entries = Object.entries(args)
  if (entries.length === 0) {
    return <span className="text-muted-foreground">{"{}"}</span>
  }
  return (
    <>
      {"{"}
      {entries.map(([key, value], index) => (
        <span key={key}>
          {"\n  "}
          <span className={key === "merchant_id" ? "rounded bg-amber-100 px-1 text-amber-900" : ""}>
            &quot;{key}&quot;
          </span>
          : {JSON.stringify(value)}
          {index < entries.length - 1 ? "," : ""}
        </span>
      ))}
      {"\n}"}
    </>
  )
}
