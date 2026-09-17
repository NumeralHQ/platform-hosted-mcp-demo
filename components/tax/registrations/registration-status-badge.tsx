"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { registrationBucket, registrationNeedsAttention, registrationStatusLabel } from "./registration-status"

/** Plain-language status with the Numeral literal in a tooltip. */
export function RegistrationStatusBadge({ status }: { status: string | null }) {
  const bucket = registrationBucket(status)
  const attention = registrationNeedsAttention(status)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="cursor-default rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <Badge
            variant={attention ? "destructive" : "outline"}
            className={cn(
              "font-normal",
              bucket === "registered" && !attention && "border-emerald-200 bg-emerald-50 text-emerald-800",
              bucket === "in_progress" && !attention && "border-amber-200 bg-amber-50 text-amber-900",
              bucket === "closed" && "text-muted-foreground"
            )}
          >
            {registrationStatusLabel(status)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono">{status ?? "null"}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
