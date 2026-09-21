/**
 * The footer line: the Numeral attribution and, when the Google gate is on,
 * who on staff is signed in with a way to sign out.
 */
export function PoweredBy({ className = "", staffEmail }: { className?: string; staffEmail?: string | null }) {
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
      {staffEmail && (
        <>
          {" "}
          <span aria-hidden="true">·</span> {staffEmail}{" "}
          <a href="/api/auth/signout" className="underline-offset-4 hover:underline">
            Sign out
          </a>
        </>
      )}
    </p>
  )
}
