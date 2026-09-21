import { NextResponse, type NextRequest } from "next/server";
import {
  GATE_COOKIE,
  hashPasscode,
  isGateOpenPath,
} from "@/app/gate/gate-cookie";
import { STAFF_COOKIE, gateMethods, verifyStaffCookie } from "@/lib/staff-gate";

/**
 * Hosted builds sit behind a gate with up to two ways through, each enabled
 * by configuration: Google sign-in restricted to allowed email domains
 * (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`) and a shared passcode
 * (`DEMO_PASSCODE`). A viewer needs only one. With neither set, which is
 * every local clone, this proxy does nothing.
 *
 * `/dev/integration` stays public on purpose: it is the page a platform
 * engineer is sent to read, and it never touches merchant data.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const methods = gateMethods();
  if (!methods.google && !methods.passcode) {
    return NextResponse.next();
  }
  const { pathname, search } = request.nextUrl;
  if (isGateOpenPath(pathname)) {
    return NextResponse.next();
  }

  if (methods.google) {
    const staff = await verifyStaffCookie(
      request.cookies.get(STAFF_COOKIE)?.value,
    );
    if (staff) {
      return NextResponse.next();
    }
  }
  if (methods.passcode) {
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
