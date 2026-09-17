"use client"

import { Button } from "@/components/ui/button"

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Something went wrong</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page could not render</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {error.message || "An unexpected error occurred."} If this is a live run, check the Numeral keys in the
        environment; in replay mode, check that the fixture exists.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
