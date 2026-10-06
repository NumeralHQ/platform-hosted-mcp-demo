"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { maskAccountNumber } from "./mask"

/**
 * Account numbers render masked to the last four; the full value only appears
 * when the merchant clicks Reveal, per row, and never leaves this component.
 */
export function MaskedAccountNumber({ value }: { value: string | null }) {
  const [revealed, setRevealed] = useState(false)
  if (!value) {
    return <span className="text-muted-foreground">Not issued yet</span>
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono tabular-nums">{revealed ? value : maskAccountNumber(value)}</span>
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded text-xs outline-none focus-visible:ring-2"
        aria-label={revealed ? "Hide account number" : "Reveal account number"}
        aria-pressed={revealed}
      >
        {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {revealed ? "Hide" : "Reveal"}
      </button>
    </span>
  )
}
