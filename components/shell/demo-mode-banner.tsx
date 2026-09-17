/**
 * A thin strip that says where the numbers on screen come from. In replay
 * mode every panel is a recorded Numeral response; in auto mode only panels
 * that could not be served live carry a "Recorded data" badge.
 */
export function DemoModeBanner({ mode, scenario }: { mode: string; scenario: string }) {
  const label =
    mode === "live"
      ? "Live: every panel is a real call to the Numeral MCP."
      : mode === "replay"
        ? `Replay: recorded Numeral responses (scenario "${scenario}"). No keys needed.`
        : "Auto: live Numeral calls, with recorded data standing in where this environment cannot call live."
  return (
    <div className="bg-muted text-muted-foreground border-b px-4 py-1.5 text-center text-xs">
      <span className="font-medium uppercase tracking-wide">Demo</span>
      <span className="mx-2">·</span>
      {label}
    </div>
  )
}
