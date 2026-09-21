"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/dashboard/tax", label: "Overview", exact: true },
  { href: "/dashboard/tax/sales", label: "Sales" },
  { href: "/dashboard/tax/nexus", label: "Nexus" },
  { href: "/dashboard/tax/registrations", label: "Registrations" },
  { href: "/dashboard/tax/filings", label: "Filings" },
  { href: "/dashboard/tax/settings", label: "Settings" },
]

export function TaxTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Tax sections">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-foreground text-foreground font-medium"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
