import "server-only";
import { cookies } from "next/headers";
import {
  STAFF_COOKIE,
  gateMode,
  verifyStaffCookie,
  type StaffSession,
} from "./staff-gate";

/** The signed-in staff viewer, when the Google gate is on. */
export async function currentStaff(): Promise<StaffSession | null> {
  if (gateMode() !== "google") {
    return null;
  }
  const jar = await cookies();
  return verifyStaffCookie(jar.get(STAFF_COOKIE)?.value);
}
