/**
 * Tiny CSV writer for the export routes. Every export re-runs the same
 * Numeral calls the page made and streams the rows back with a provenance
 * header, so what the merchant downloads is exactly what they saw.
 */
export interface CsvColumn<Row> {
  header: string
  value: (row: Row) => string | number | null | undefined
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv<Row>(
  rows: readonly Row[],
  columns: readonly CsvColumn<Row>[],
  options: { provenance?: string } = {}
): string {
  const lines: string[] = []
  if (options.provenance) {
    lines.push(`# ${options.provenance}`)
  }
  lines.push(columns.map((column) => escapeCell(column.header)).join(","))
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(column.value(row))).join(","))
  }
  return `${lines.join("\r\n")}\r\n`
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

export function provenanceLine(source: "live" | "fixture" | "mixed", now = new Date()): string {
  const origin = source === "live" ? "Numeral (live)" : source === "fixture" ? "Numeral (recorded demo data)" : "Numeral (live + recorded demo data)"
  return `Source: ${origin}. Exported ${now.toISOString()}. Read-only.`
}
