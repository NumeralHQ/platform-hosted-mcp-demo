import type { ReactNode } from "react"

/** A numbered section of the engineer's page: heading, one-line intent, body. */
export function DevSection({
  id,
  title,
  lede,
  children,
}: {
  id: string
  title: string
  lede: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          <a href={`#${id}`} className="hover:underline">
            {title}
          </a>
        </h2>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">{lede}</p>
      </div>
      {children}
    </section>
  )
}
