import { formatCount, formatUsd, humanize } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RawJsonToggle } from "./raw-json-toggle"

/**
 * `calculated_sales_data` has no fixed schema: it is whatever Numeral's
 * calculation for that state produced. This renders it generically: objects
 * become sections, leaves become label/value rows, numbers under money-shaped
 * keys are shown as dollars (filing amounts are dollars, not minor units).
 */
const MONEY_KEY = /(sales|amount|tax|total|revenue|collected|remitted|penalty|interest|fee|due|gross|net|exempt|categories|channels|breakdown)/i
const COUNT_KEY = /(count|index|quantity|number|qty)/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * A number is money when its own key or its parent's key looks like money
 * (`taxable_sales`, `categories.physical_goods`), or when it carries cents.
 * Integers under count-shaped keys (`period_index`) stay plain.
 */
function formatLeaf(key: string, value: unknown, parentKey: string | null = null): string {
  if (value === null || value === undefined) {
    return "—"
  }
  if (typeof value === "number") {
    if (COUNT_KEY.test(key) && Number.isInteger(value)) {
      return formatCount(value)
    }
    const moneyShaped = MONEY_KEY.test(key) || (parentKey !== null && MONEY_KEY.test(parentKey))
    return moneyShaped || !Number.isInteger(value) ? formatUsd(value) : formatCount(value)
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }
  if (typeof value === "string") {
    return value
  }
  return JSON.stringify(value)
}

function Section({ title, value, depth }: { title: string | null; value: Record<string, unknown>; depth: number }) {
  const leaves: Array<[string, unknown]> = []
  const nested: Array<[string, Record<string, unknown>]> = []
  const lists: Array<[string, unknown[]]> = []
  for (const [key, entry] of Object.entries(value)) {
    if (isRecord(entry)) {
      nested.push([key, entry])
    } else if (Array.isArray(entry)) {
      lists.push([key, entry])
    } else {
      leaves.push([key, entry])
    }
  }
  return (
    <div className={depth > 0 ? "space-y-3" : "space-y-4"}>
      {title ? (
        <h4 className={depth <= 1 ? "text-sm font-medium" : "text-muted-foreground text-xs font-medium tracking-wide uppercase"}>
          {humanize(title)}
        </h4>
      ) : null}
      {leaves.length > 0 ? (
        <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
          {leaves.map(([key, entry]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{humanize(key)}</dt>
              <dd className="tabular-nums sm:text-right">{formatLeaf(key, entry, title)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {lists.map(([key, entries]) => (
        <div key={key} className="space-y-1.5">
          <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{humanize(key)}</h5>
          <ul className="space-y-2">
            {entries.map((entry, index) => (
              <li key={index} className="rounded-md border p-3">
                {isRecord(entry) ? <Section title={null} value={entry} depth={depth + 1} /> : <span className="text-sm">{formatLeaf(key, entry)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {nested.length > 0 ? (
        <div className={depth === 0 ? "grid gap-4 md:grid-cols-2" : "space-y-3 border-l pl-3"}>
          {nested.map(([key, entry]) => (
            <div key={key} className={depth === 0 ? "rounded-lg border p-3" : ""}>
              <Section title={key} value={entry} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CalculatedSalesData({ data }: { data: unknown }) {
  const json = JSON.stringify(data ?? null, null, 2)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How this return was calculated</CardTitle>
        <CardDescription>
          The breakdown Numeral recorded with the return. Shown as returned; amounts in dollars.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRecord(data) ? (
          <Section title={null} value={data} depth={0} />
        ) : (
          <p className="text-muted-foreground text-sm">
            {data === null || data === undefined ? "No calculation breakdown was recorded for this return." : formatLeaf("value", data)}
          </p>
        )}
        <RawJsonToggle json={json} />
      </CardContent>
    </Card>
  )
}
