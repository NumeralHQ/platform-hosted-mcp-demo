import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AttentionItem } from "@/lib/home/aggregate"
import { cn } from "@/lib/utils"

const TONE_DOT: Record<AttentionItem["tone"], string> = {
  urgent: "bg-red-500",
  soon: "bg-amber-500",
  info: "bg-sky-500",
}

/** The merchant's to-do list: platform tasks and tax tasks in one place, soonest first. */
export function AttentionList({ items }: { items: readonly AttentionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs your attention</CardTitle>
        <CardDescription>
          {items.length === 0 ? "You are all caught up." : `${items.length} ${items.length === 1 ? "thing" : "things"} to look at`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="group flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-muted/50"
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_DOT[item.tone])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{item.title}</span>
                  <span className="text-muted-foreground block text-xs leading-snug">{item.detail}</span>
                </span>
                <span className="text-muted-foreground group-hover:text-foreground mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-xs font-medium">
                  {item.action}
                  <ChevronRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
