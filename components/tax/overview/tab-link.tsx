import Link from "next/link"
import { ArrowRight } from "lucide-react"

/** The footer link every overview card uses to hand off to its full tab. */
export function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  )
}
