import Link from "next/link"
import { cn } from "@/lib/utils"

export interface SegmentedOption {
  label: string
  href: string
  active: boolean
}

/**
 * A toggle made of links. Every option is a full URL, so switching range or
 * metric is a navigation the server answers, not client state to hydrate.
 */
export function SegmentedLinks({ label, options }: { label: string; options: readonly SegmentedOption[] }) {
  return (
    <nav aria-label={label} className="bg-muted inline-flex rounded-lg p-0.5 text-xs">
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.active ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium whitespace-nowrap transition-colors",
            option.active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  )
}
