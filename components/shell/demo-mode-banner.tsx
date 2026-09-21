/**
 * A thin strip that says where the numbers on screen come from. In replay
 * mode every panel is a recorded Numeral response; in auto mode only panels
 * that could not be served live carry a "Recorded data" badge. When the
 * Google gate is on, it also shows who is signed in.
 */
export function DemoModeBanner({
  mode,
  scenario,
  staffEmail,
}: {
  mode: string;
  scenario: string;
  staffEmail?: string | null;
}) {
  const label =
    mode === "live"
      ? "Live: every panel is a real call to the Numeral MCP."
      : mode === "replay"
        ? `Replay: recorded Numeral responses (scenario "${scenario}"). No keys needed.`
        : "Auto: live Numeral calls, with recorded data standing in where this environment cannot call live.";
  return (
    <div className="bg-muted text-muted-foreground flex items-center justify-center gap-2 border-b px-4 py-1.5 text-center text-xs">
      <span className="font-medium uppercase tracking-wide">Demo</span>
      <span>·</span>
      <span>{label}</span>
      {staffEmail && (
        <>
          <span>·</span>
          <span>{staffEmail}</span>
          <a
            href="/api/auth/signout"
            className="underline-offset-4 hover:underline"
          >
            Sign out
          </a>
        </>
      )}
    </div>
  );
}
