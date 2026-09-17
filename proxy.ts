import { NextResponse, type NextRequest } from "next/server"
import { GATE_COOKIE, hashPasscode, isGateOpenPath } from "@/app/gate/gate-cookie"

/**
 * Hosted builds can sit behind a shared passcode (`DEMO_PASSCODE`). When it is
 * unset, which is the case for every local clone, this proxy does nothing.
 *
 * `/dev/integration` stays public on purpose: it is the page a platform
 * engineer is sent to read, and it never touches merchant data.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const passcode = process.env.DEMO_PASSCODE?.trim()
  if (!passcode) {
    return NextResponse.next()
  }
  const { pathname, search } = request.nextUrl
  if (isGateOpenPath(pathname)) {
    return NextResponse.next()
  }
  const expected = await hashPasscode(passcode)
  if (request.cookies.get(GATE_COOKIE)?.value === expected) {
    return NextResponse.next()
  }
  const gate = new URL("/gate", request.url)
  gate.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(gate)
}

export const config = {
  // Skip Next internals and anything with a file extension (favicon, images).
  matcher: ["/((?!_next/|.*\\..*).*)"],
}
