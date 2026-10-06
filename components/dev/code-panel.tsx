import { Badge } from "@/components/ui/badge"

/**
 * Read-only source view. The page reads the real file at request time so the
 * documentation cannot drift from the code a platform engineer would copy.
 */
export function CodePanel({ file, code, note }: { file: string; code: string; note?: string }) {
  const lines = code.replace(/\n$/, "").split("\n")
  return (
    <figure className="overflow-hidden rounded-xl border">
      <figcaption className="bg-muted/60 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <span className="font-mono text-xs font-medium">{file}</span>
        <span className="flex items-center gap-2">
          {note && <span className="text-muted-foreground text-xs">{note}</span>}
          <Badge variant="outline" className="font-normal tabular-nums">
            {lines.length} lines
          </Badge>
        </span>
      </figcaption>
      <pre className="max-h-[36rem] overflow-auto p-4 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  )
}
