"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { filingBucket, filingStatusLabel } from "./filing-status"

/** Plain-language filing status with the Numeral literal in a tooltip. */
export function FilingStatusBadge({ status }: { status: string | null }) {
  const bucket = filingBucket(status)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="cursor-default rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <Badge
            variant={bucket === "needs_attention" ? "destructive" : "outline"}
            className={cn(
              "font-normal",
              bucket === "filed" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              bucket === "due_soon" && status === "pending_client_approval" && "border-amber-200 bg-amber-50 text-amber-900",
              bucket === "canceled" && "text-muted-foreground"
            )}
          >
            {filingStatusLabel(status)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono">{status ?? "null"}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
