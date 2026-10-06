import { Button } from "@/components/ui/button"

export interface Choice {
  value: string
  label: string
  hint?: string
}

/**
 * A row of submit buttons bound to one server action. The active choice is
 * filled; the rest are outlined. No client state: the action sets a cookie
 * and redirects back, and the page re-renders with the new value.
 */
export function ChoiceForm({
  name,
  choices,
  active,
  token,
  action,
}: {
  name: string
  choices: readonly Choice[]
  active: string | null
  /** Carried along so the action stays unlocked before the admin cookie exists. */
  token: string | null
  action: (formData: FormData) => Promise<void>
}) {
  return (
    <form action={action} className="flex flex-wrap gap-2">
      {token !== null && <input type="hidden" name="token" value={token} />}
      {choices.map((choice) => (
        <Button
          key={choice.value}
          type="submit"
          name={name}
          value={choice.value}
          size="sm"
          variant={choice.value === active ? "default" : "outline"}
          title={choice.hint}
        >
          {choice.label}
        </Button>
      ))}
    </form>
  )
}
