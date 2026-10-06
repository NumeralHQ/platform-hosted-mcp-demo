import Link from "next/link"
import { X } from "lucide-react"
import type { FilingSummary } from "@/lib/numeral"
import { cn } from "@/lib/utils"
import { filingFiltersToSearch, type FilingFilters } from "./filters"
import { filingStatusLabel, isFilingStatus, type FilingStatusLiteral } from "./filing-status"

const BASE = "/dashboard/tax/filings"

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      )}
      aria-current={active ? "true" : undefined}
    >
      {children}
      {active ? <X className="size-3" aria-hidden /> : null}
    </Link>
  )
}

/**
 * Link chips for the three URL filters. Options come from the rows that came
 * back plus whatever is currently active, so a chip never points at an empty
 * result the merchant cannot see coming.
 */
export function FilingFilterChips({
  filters,
  filings,
}: {
  filters: FilingFilters
  filings: readonly FilingSummary[]
}) {
  const states = new Set<string>()
  const years = new Set<number>()
  const statuses = new Set<FilingStatusLiteral>()
  for (const filing of filings) {
    if (filing.state) {
      states.add(filing.state)
    }
    const year = filing.period_starts_at?.slice(0, 4)
    if (year) {
      years.add(Number(year))
    }
    if (filing.status && isFilingStatus(filing.status)) {
      statuses.add(filing.status)
    }
  }
  if (filters.state) {
    states.add(filters.state)
  }
  if (filters.year) {
    years.add(filters.year)
  }
  if (filters.status) {
    statuses.add(filters.status)
  }

  const toggle = (patch: Partial<FilingFilters>): string => `${BASE}${filingFiltersToSearch({ ...filters, ...patch })}`
  const anyActive = filters.state !== null || filters.year !== null || filters.status !== null

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
      <FilterRow label="State">
        {[...states].sort().map((state) => (
          <Chip key={state} href={toggle({ state: filters.state === state ? null : state })} active={filters.state === state}>
            {state}
          </Chip>
        ))}
      </FilterRow>
      <FilterRow label="Period year">
        {[...years]
          .sort((a, b) => b - a)
          .map((year) => (
            <Chip key={year} href={toggle({ year: filters.year === year ? null : year })} active={filters.year === year}>
              {year}
            </Chip>
          ))}
      </FilterRow>
      <FilterRow label="Status">
        {[...statuses].sort().map((status) => (
          <Chip
            key={status}
            href={toggle({ status: filters.status === status ? null : status })}
            active={filters.status === status}
          >
            {filingStatusLabel(status)}
          </Chip>
        ))}
      </FilterRow>
      {anyActive ? (
        <Link href={BASE} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
          Clear filters
        </Link>
      ) : null}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground mr-1">{label}</span>
      {children}
    </div>
  )
}
