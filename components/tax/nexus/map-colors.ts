import type { MapStatus } from "./model"

/**
 * Choropleth fills. The three status hues were run through the dataviz
 * palette validator as an all-pairs set on a white surface (CVD ΔE 16.2,
 * normal-vision ΔE 18.8, all ≥ 3:1). "Safe" is intentionally a near-surface
 * neutral: it means "nothing to act on", not a fourth series, so it is not
 * held to the series lightness band. Every fill is paired with a label in
 * the legend, tooltip and table, so color never carries meaning alone.
 */
export const MAP_FILLS = {
  /** has_nexus and registered: the platform's strong accent. */
  registered: "#0369a1",
  /** has_nexus and not registered: the one thing that needs attention. */
  unregistered: "#b91c1c",
  approaching: "#d97706",
  safe: "#e5e7eb",
  /** States the study did not mention at all. */
  none: "#f4f4f5",
  stroke: "#ffffff",
} as const

export type MapFillKey = keyof typeof MAP_FILLS

export function fillKeyFor(status: MapStatus, registered: boolean): MapFillKey {
  switch (status) {
    case "has_nexus":
      return registered ? "registered" : "unregistered"
    case "approaching":
      return "approaching"
    case "safe":
      return "safe"
  }
}

export interface LegendEntry {
  key: MapFillKey
  label: string
}

export function mapLegend(): readonly LegendEntry[] {
  return [
    { key: "registered", label: "Collecting, registered" },
    { key: "unregistered", label: "Has nexus, not yet registered" },
    { key: "approaching", label: "Approaching threshold" },
    { key: "safe", label: "Below threshold" },
    { key: "none", label: "No sales recorded" },
  ]
}
