import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE } from "@/app/gate/gate-cookie";
import { STAFF_COOKIE } from "@/lib/staff-gate";

/** Clears the viewer's gate cookies (Google staff session or passcode). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  jar.delete(STAFF_COOKIE);
  jar.delete(GATE_COOKIE);
  return NextResponse.redirect(new URL("/gate", request.url));
}
