"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JurisdictionDetailDrawer } from "./jurisdiction-detail-drawer"
import { JurisdictionTable } from "./jurisdiction-table"
import { mapStates, type JurisdictionRow } from "./model"
import { UsNexusMap } from "./us-nexus-map"

/**
 * Holds the one piece of client state on the page, the selected state, and
 * keeps the map, the table and the drawer in agreement. The selection is
 * mirrored to `?state=XX` so a row can be linked to.
 */
export function NexusExplorer({
  rows,
  initialState,
  marketplaceChannel,
  storefrontChannel,
  mapHeader,
  tableHeader,
}: {
  rows: readonly JurisdictionRow[]
  initialState: string | null
  marketplaceChannel: string
  storefrontChannel: string
  mapHeader: React.ReactNode
  tableHeader: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const byCode = useMemo(() => new Map(rows.filter((r) => r.stateCode).map((r) => [r.stateCode ?? "", r])), [rows])
  const [selected, setSelected] = useState<string | null>(initialState && byCode.has(initialState) ? initialState : null)
  const states = useMemo(() => mapStates(rows), [rows])

  const select = useCallback(
    (code: string | null) => {
      setSelected(code)
      router.replace(code ? `${pathname}?state=${code}` : pathname, { scroll: false })
    },
    [pathname, router]
  )

  useEffect(() => {
    if (selected) {
      document.getElementById(`nexus-row-${selected}`)?.scrollIntoView({ block: "nearest" })
    }
  }, [selected])

  const selectedRow = selected ? byCode.get(selected) ?? null : null

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Where you stand</CardTitle>
            <CardDescription>
              Hover a state for its threshold and whether {marketplaceChannel} sales count there. Click to open the details.
            </CardDescription>
          </div>
          {mapHeader}
        </CardHeader>
        <CardContent>
          <UsNexusMap states={states} selected={selected} onSelect={select} marketplaceChannel={marketplaceChannel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Every state in the study</CardTitle>
            <CardDescription>
              Collecting states first, then the ones approaching a threshold. &ldquo;Marketplace&rdquo; is whether{" "}
              {marketplaceChannel} sales count toward that state&apos;s threshold.
            </CardDescription>
          </div>
          {tableHeader}
        </CardHeader>
        <CardContent className="px-0">
          <JurisdictionTable rows={rows} selected={selected} onSelect={select} marketplaceChannel={marketplaceChannel} />
        </CardContent>
      </Card>

      <JurisdictionDetailDrawer
        row={selectedRow}
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            select(null)
          }
        }}
        marketplaceChannel={marketplaceChannel}
        storefrontChannel={storefrontChannel}
      />
    </>
  )
}
