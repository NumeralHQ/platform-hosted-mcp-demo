import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMinorUsd, formatPercent } from "@/lib/format"

export interface ShareRow {
  key: string
  label: string
  sublabel?: string
  /** Minor units. */
  sales: number
  /** 0–1. */
  share: number
}

/** A ranked list with a proportional bar per row: top states, top products. */
export function ShareList({
  title,
  description,
  rows,
  color,
  empty = "Nothing to show yet.",
}: {
  title: string
  description: string
  rows: readonly ShareRow[]
  color: string
  empty?: string
}) {
  const max = rows.reduce((top, row) => Math.max(top, row.share), 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{row.label}</span>
                    {row.sublabel && <span className="text-muted-foreground"> · {row.sublabel}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatMinorUsd(row.sales, { cents: false })}
                    <span className="text-muted-foreground"> · {formatPercent(row.share * 100)}</span>
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${max === 0 ? 0 : (row.share / max) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
