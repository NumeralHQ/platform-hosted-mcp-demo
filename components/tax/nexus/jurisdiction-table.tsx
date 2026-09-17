"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MarketplaceInclusionBadge } from "./marketplace-inclusion-badge"
import { REGISTRATION_LABELS, sourceLabel, type JurisdictionRow } from "./model"
import { StatusBadge } from "./status-badge"
import { ThresholdMeter, toneFor } from "./threshold-meter"

/**
 * Every US jurisdiction in the study, already sorted by the model. Rows are
 * buttons: clicking one selects the state (map highlight + detail drawer).
 */
export function JurisdictionTable({
  rows,
  selected,
  onSelect,
  marketplaceChannel,
}: {
  rows: readonly JurisdictionRow[]
  selected: string | null
  onSelect: (stateCode: string) => void
  marketplaceChannel: string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>State</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Threshold</TableHead>
          <TableHead>Rule</TableHead>
          <TableHead title={`Whether ${marketplaceChannel} sales count toward the threshold`}>Marketplace</TableHead>
          <TableHead>Collecting since</TableHead>
          <TableHead>Registration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const registered = row.registration.state === "registered"
          const isSelected = row.stateCode !== null && row.stateCode === selected
          return (
            <TableRow
              key={row.jurisdictionId}
              id={row.stateCode ? `nexus-row-${row.stateCode}` : undefined}
              data-state={isSelected ? "selected" : undefined}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              onClick={() => row.stateCode && onSelect(row.stateCode)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && row.stateCode) {
                  event.preventDefault()
                  onSelect(row.stateCode)
                }
              }}
              className={cn("cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", isSelected && "bg-muted")}
            >
              <TableCell className="font-medium">
                {row.name} <span className="text-muted-foreground ml-1 font-mono text-xs">{row.stateCode}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} registered={registered} />
              </TableCell>
              <TableCell className="text-muted-foreground">{sourceLabel(row.source)}</TableCell>
              <TableCell>
                <ThresholdMeter percent={row.thresholdPercent} tone={toneFor(row.status, registered)} compact />
              </TableCell>
              <TableCell className="text-muted-foreground max-w-72 truncate whitespace-normal" title={row.rule}>
                {row.rule}
              </TableCell>
              <TableCell>
                <MarketplaceInclusionBadge counts={row.marketplaceCounts} marketplaceChannel={marketplaceChannel} />
              </TableCell>
              <TableCell className="tabular-nums">{formatDate(row.collectionStart)}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "text-xs",
                    row.registration.state === "registered"
                      ? "text-foreground"
                      : row.registration.state === "in_progress"
                        ? "text-amber-800"
                        : row.status === "has_nexus" && row.registration.state === "none"
                          ? "font-medium text-red-800"
                          : "text-muted-foreground"
                  )}
                >
                  {REGISTRATION_LABELS[row.registration.state]}
                  {row.registration.state === "in_progress" && row.registration.detail ? (
                    <span className="text-muted-foreground block font-normal">{row.registration.detail}</span>
                  ) : null}
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
