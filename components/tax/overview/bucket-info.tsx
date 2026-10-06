"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * The "what does this bucket mean" affordance on a stat tile: the plain
 * explanation plus the Numeral liability literals it collapses, so an
 * engineer on the call can map the label back to the API.
 */
export function BucketInfo({ label, summary, roles }: { label: string; summary: string; roles: readonly string[] }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded-full"
          aria-label={`About ${label}`}
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="block max-w-72 text-left leading-relaxed">
          <p>{summary}</p>
          <p className="mt-1.5 font-mono text-[11px] opacity-80">
            liability: {roles.join(" · ")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
