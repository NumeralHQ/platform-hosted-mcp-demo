"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** The exact JSON Numeral returned, behind a toggle. */
export function RawJsonToggle({ json }: { json: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden />
        {open ? "Hide raw JSON" : "Raw JSON"}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="bg-muted mt-3 max-h-96 overflow-auto rounded-md p-3 text-xs leading-relaxed">{json}</pre>
      </CollapsibleContent>
    </Collapsible>
  )
}
