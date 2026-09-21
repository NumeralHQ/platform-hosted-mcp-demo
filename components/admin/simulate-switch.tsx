"use client"

import { useTransition } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

/**
 * The one admin control that reads better as a switch than a row of buttons.
 * Flipping it calls the server action, which sets the cookie and redirects.
 */
export function SimulateSwitch({
  checked,
  token,
  onChangeAction,
}: {
  checked: boolean
  /** Present only when the page was unlocked with ?token= and no cookie exists yet. */
  token: string | null
  onChangeAction: (enabled: boolean, token: string | null) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-3">
      <Switch
        id="simulate-unlinked"
        checked={checked}
        disabled={pending}
        onCheckedChange={(next) => startTransition(() => onChangeAction(next, token))}
      />
      <Label htmlFor="simulate-unlinked">
        {checked ? "On: the merchant appears not connected" : "Off: use the real link state"}
      </Label>
    </div>
  )
}
