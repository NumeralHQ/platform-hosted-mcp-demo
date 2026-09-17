"use client"

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react"
import type { GeoJsonObject } from "geojson"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import statesTopology from "us-atlas/states-10m.json"
import { cn } from "@/lib/utils"
import { MAP_FILLS, fillKeyFor, mapLegend, type MapFillKey } from "./map-colors"
import { STATUS_LABELS, formatPercentReal, type MapState } from "./model"
import { stateCodeForFips } from "./us-states"

/**
 * The US choropleth. Receives plain rows, colors by status × registered,
 * fades the fills in on mount, and hands hover/click back to the explorer.
 * No tiles, no map service: the outlines ship with the app.
 */

function isGeoJsonObject(value: unknown): value is GeoJsonObject {
  return typeof value === "object" && value !== null && "type" in value
}

const TOPOLOGY: GeoJsonObject | null = isGeoJsonObject(statesTopology) ? statesTopology : null

interface HoverState {
  code: string
  x: number
  y: number
}

export function UsNexusMap({
  states,
  selected,
  onSelect,
  marketplaceChannel,
  className,
}: {
  states: readonly MapState[]
  selected: string | null
  onSelect: (stateCode: string | null) => void
  marketplaceChannel: string
  className?: string
}) {
  const byCode = useMemo(() => new Map(states.map((s) => [s.stateCode, s])), [states])
  const [mounted, setMounted] = useState(false)
  const [hover, setHover] = useState<HoverState | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const hovered = hover ? byCode.get(hover.code) ?? null : null

  function move(event: MouseEvent<SVGPathElement>, code: string): void {
    const bounds = event.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect()
    if (!bounds) {
      return
    }
    setHover({ code, x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  }

  function key(event: KeyboardEvent<SVGPathElement>, code: string): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(code)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <ComposableMap
        projection="geoAlbersUsa"
        width={960}
        height={560}
        className="h-auto w-full"
        role="img"
        aria-label="Map of US states colored by nexus status"
      >
        {TOPOLOGY && (
          <Geographies geography={TOPOLOGY}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const code = stateCodeForFips(String(geo.id))
                if (!code) {
                  return null
                }
                const row = byCode.get(code)
                const fillKey: MapFillKey = row ? fillKeyFor(row.status, row.registered) : "none"
                const isSelected = selected === code
                const isHovered = hover?.code === code
                const label = row
                  ? `${row.name}: ${STATUS_LABELS[row.status]}${row.thresholdPercent !== null ? `, ${formatPercentReal(row.thresholdPercent)} of threshold` : ""}`
                  : `${code}: no sales recorded`
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={row ? 0 : -1}
                    role={row ? "button" : undefined}
                    aria-label={label}
                    aria-pressed={row ? isSelected : undefined}
                    onMouseEnter={(event) => move(event, code)}
                    onMouseMove={(event) => move(event, code)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover((prev) => prev ?? { code, x: 24, y: 24 })}
                    onBlur={() => setHover(null)}
                    onClick={() => (row ? onSelect(isSelected ? null : code) : undefined)}
                    onKeyDown={(event) => (row ? key(event, code) : undefined)}
                    style={{
                      fill: mounted ? MAP_FILLS[fillKey] : MAP_FILLS.none,
                      stroke: isSelected ? "#0a0a0a" : MAP_FILLS.stroke,
                      strokeWidth: isSelected ? 2 : 0.75,
                      outline: "none",
                      cursor: row ? "pointer" : "default",
                      transition: "fill 600ms ease, stroke 150ms ease, filter 150ms ease",
                      filter: isHovered && row ? "brightness(0.92)" : undefined,
                    }}
                  />
                )
              })
            }
          </Geographies>
        )}
      </ComposableMap>

      {hovered && hover && (
        <div
          role="tooltip"
          className="bg-popover text-popover-foreground pointer-events-none absolute z-20 w-56 rounded-lg p-3 text-xs shadow-md ring-1 ring-foreground/10"
          style={{ left: hover.x + 14, top: hover.y + 14, transform: hover.x > 600 ? "translateX(-100%) translateX(-28px)" : undefined }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{hovered.name}</p>
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: MAP_FILLS[fillKeyFor(hovered.status, hovered.registered)] }}
            />
          </div>
          <p className="text-muted-foreground mt-0.5">
            {STATUS_LABELS[hovered.status]}
            {hovered.status === "has_nexus" ? (hovered.registered ? " · registered" : " · not registered") : ""}
          </p>
          {hovered.thresholdPercent !== null && (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Threshold</span>
                <span className="font-medium tabular-nums">{formatPercentReal(hovered.thresholdPercent)}</span>
              </div>
              <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, hovered.thresholdPercent))}%`,
                    backgroundColor: MAP_FILLS[fillKeyFor(hovered.status, hovered.registered)],
                  }}
                />
              </div>
            </div>
          )}
          {hovered.marketplaceCounts !== null && (
            <p className="mt-2 border-t pt-2">
              <span className="text-muted-foreground">Marketplace sales count here: </span>
              <span className="font-medium">{hovered.marketplaceCounts ? "Yes" : "No"}</span>
              <span className="text-muted-foreground block">
                {hovered.marketplaceCounts
                  ? `${marketplaceChannel} sales push you toward this threshold.`
                  : `Only your storefront sales count; ${marketplaceChannel} sales are excluded.`}
              </span>
            </p>
          )}
          <p className="text-muted-foreground mt-2 text-[11px]">Click for details</p>
        </div>
      )}

      <MapLegend className="mt-3" />
    </div>
  )
}

export function MapLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs", className)} aria-label="Map legend">
      {mapLegend().map((entry) => (
        <li key={entry.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm ring-1 ring-foreground/10"
            style={{ backgroundColor: MAP_FILLS[entry.key] }}
          />
          <span className="text-muted-foreground">{entry.label}</span>
        </li>
      ))}
    </ul>
  )
}
