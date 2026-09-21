import { Badge } from "@/components/ui/badge"
import { TOOL_KEY_KIND, TOOL_NAMES } from "@/lib/numeral/schemas"

export interface CatalogEntry {
  name: string
  description?: string
}

/**
 * The tool list. Live from `tools/list` when a key is configured; otherwise
 * the static list of the nine tools this demo calls.
 */
function keyKindFor(name: string): "test" | "live" | null {
  for (const [tool, kind] of Object.entries(TOOL_KEY_KIND)) {
    if (tool === name) {
      return kind
    }
  }
  return null
}

export function ToolCatalog({ live, error }: { live: CatalogEntry[] | null; error: string | null }) {
  const entries: CatalogEntry[] = live ?? TOOL_NAMES.map((name) => ({ name }))
  const used = new Set<string>(TOOL_NAMES)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {live ? (
          <>
            <Badge>live</Badge>
            <span className="text-muted-foreground">
              {live.length} tools returned by <span className="font-mono">tools/list</span> on the sk_test_ key.
            </span>
          </>
        ) : (
          <>
            <Badge variant="outline">static</Badge>
            <span className="text-muted-foreground">
              The live catalog needs a key in this environment{error ? ` (${error})` : ""}. Showing the tools
              this demo calls.
            </span>
          </>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const kind = keyKindFor(entry.name)
          return (
            <li key={entry.name} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium">{entry.name}</span>
                {kind ? (
                  <Badge variant={kind === "live" ? "default" : "secondary"} className="font-mono text-[10px]">
                    {kind === "live" ? "sk_prod_" : "sk_test_"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    not used here
                  </Badge>
                )}
              </div>
              {entry.description && (
                <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">{entry.description}</p>
              )}
              {!used.has(entry.name) && !entry.description && (
                <p className="text-muted-foreground mt-1 text-xs">Available on the MCP; this demo does not call it.</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
