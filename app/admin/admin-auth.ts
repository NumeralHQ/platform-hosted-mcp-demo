import "server-only"
import { createHash } from "node:crypto"
import { cookies } from "next/headers"

/**
 * Who may use /admin. Unlock happens either with `?token=<ADMIN_TOKEN>` on
 * the URL or with the cookie the actions set after a successful token visit.
 * The cookie holds a hash of the token, so the token itself never travels
 * back to the browser.
 */
export const ADMIN_COOKIE = "demo_admin"

export function adminToken(): string {
  return process.env.ADMIN_TOKEN?.trim() || "change-me"
}

export function adminCookieValue(): string {
  return createHash("sha256").update(`tundra-admin:${adminToken()}`).digest("hex")
}

export function tokenMatches(presented: string | null | undefined): boolean {
  return typeof presented === "string" && presented.length > 0 && presented === adminToken()
}

export async function hasAdminCookie(): Promise<boolean> {
  const jar = await cookies()
  return jar.get(ADMIN_COOKIE)?.value === adminCookieValue()
}
