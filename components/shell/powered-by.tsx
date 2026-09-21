export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-muted-foreground text-center text-xs ${className}`}>
      Tax data powered by{" "}
      <a
        href="https://www.numeralhq.com"
        className="font-medium text-foreground underline-offset-4 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        Numeral
      </a>
      . Tundra is a fictional platform built to demonstrate the Numeral MCP.
    </p>
  )
}
