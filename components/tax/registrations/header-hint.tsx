"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/** A column header with an explanatory tooltip. */
export function HeaderHint({ label, hint }: { label: string; hint: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex cursor-default items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {label}
          <Info className="text-muted-foreground size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
