import { NextResponse, type NextRequest } from "next/server";
import {
  GATE_COOKIE,
  hashPasscode,
  isGateOpenPath,
} from "@/app/gate/gate-cookie";
import { STAFF_COOKIE, gateMode, verifyStaffCookie } from "@/lib/staff-gate";

/**
 * Hosted builds sit behind one of two gates, chosen by configuration:
 * Google sign-in restricted to allowed email domains (`GOOGLE_CLIENT_ID` +
 * `GOOGLE_CLIENT_SECRET`), or a shared passcode (`DEMO_PASSCODE`). With
 * neither set, which is every local clone, this proxy does nothing.
 *
 * `/dev/integration` stays public on purpose: it is the page a platform
 * engineer is sent to read, and it never touches merchant data.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const mode = gateMode();
  if (mode === "open") {
    return NextResponse.next();
  }
  const { pathname, search } = request.nextUrl;
  if (isGateOpenPath(pathname)) {
    return NextResponse.next();
  }

  if (mode === "google") {
    const staff = await verifyStaffCookie(
      request.cookies.get(STAFF_COOKIE)?.value,
    );
    if (staff) {
      return NextResponse.next();
    }
  } else {
    const expected = await hashPasscode(
      process.env.DEMO_PASSCODE?.trim() ?? "",
    );
    if (request.cookies.get(GATE_COOKIE)?.value === expected) {
      return NextResponse.next();
    }
  }

  const gate = new URL("/gate", request.url);
  gate.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(gate);
}

export const config = {
  // Skip Next internals and anything with a file extension (favicon, images).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
