"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Column-header tooltip for a liability bucket: the plain-language meaning
 * plus the Numeral liability literals that fold into it. The strings come in
 * as props because `bucketExplanation` needs the skin, which is server-side.
 */
export function BucketTooltip({
  label,
  summary,
  roles,
  color,
}: {
  label: string
  summary: string
  roles: readonly string[]
  color: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex cursor-help items-center gap-1.5 underline decoration-dotted underline-offset-4" />
          }
        >
          <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
          {label}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs flex-col items-start gap-1.5 py-2 text-left">
          <p className="leading-snug">{summary}</p>
          <p className="font-mono text-[10px] opacity-70">{roles.join(" · ")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
