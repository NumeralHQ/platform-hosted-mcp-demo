"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Home, Landmark, Package, Users, Wallet, type LucideIcon } from "lucide-react"
import type { PlatformSkin } from "@/platform.config"
import { cn } from "@/lib/utils"
import { PlatformMark } from "./platform-mark"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Match the path exactly instead of by prefix. */
  exact?: boolean
  /** Platform chrome that is not part of the demo; points back home. */
  mock?: boolean
}

const NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/products", label: "Products", icon: Package, mock: true },
  { href: "/dashboard/members", label: "Members", icon: Users, mock: true },
  { href: "/dashboard/payouts", label: "Payouts", icon: Wallet, mock: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, mock: true },
  { href: "/dashboard/tax", label: "Tax", icon: Landmark },
]

export function Sidebar({
  skin,
  merchantName,
  taxBadge,
}: {
  skin: PlatformSkin
  merchantName: string
  taxBadge: number
}) {
  const pathname = usePathname()
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center px-5">
        <PlatformMark skin={skin} />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          const href = item.mock ? "/dashboard" : item.href
          return (
            <Link
              key={item.href}
              href={href}
              aria-disabled={item.mock ? true : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                item.mock && "opacity-60"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.label === "Tax" && taxBadge > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
                  {taxBadge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t px-5 py-4">
        <p className="text-muted-foreground text-xs">Signed in as</p>
        <p className="truncate text-sm font-medium">{merchantName}</p>
        <Link href="/login" className="text-muted-foreground mt-1 inline-block text-xs underline-offset-4 hover:underline">
          Switch account
        </Link>
      </div>
    </aside>
  )
}
