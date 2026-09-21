/**
 * The hosted-demo passcode gate. Shared by `proxy.ts` (edge runtime) and the
 * gate's server action, so it only uses Web Crypto: no Node imports here.
 *
 * The cookie holds a SHA-256 of the passcode rather than the passcode itself,
 * so rotating `DEMO_PASSCODE` invalidates every existing cookie at once.
 */
export const GATE_COOKIE = "demo_gate"

export const GATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** Paths that stay reachable without the passcode. */
export const GATE_OPEN_PATHS: readonly string[] = ["/gate", "/api/health", "/dev/integration"]

export function isGateOpenPath(pathname: string): boolean {
  for (const open of GATE_OPEN_PATHS) {
    if (pathname === open || pathname.startsWith(`${open}/`)) {
      return true
    }
  }
  return false
}

export async function hashPasscode(passcode: string): Promise<string> {
  const bytes = new TextEncoder().encode(`tundra-gate:${passcode}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  let hex = ""
  for (const byte of new Uint8Array(digest)) {
    hex += byte.toString(16).padStart(2, "0")
  }
  return hex
}

/** Only allow same-origin relative paths as a post-gate destination. */
export function safeNextPath(candidate: string | null | undefined): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/gate")) {
    return "/"
  }
  return candidate
}
