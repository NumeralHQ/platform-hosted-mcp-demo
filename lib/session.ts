import "server-only"
import { getIronSession, type SessionOptions } from "iron-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * The demo's "login" is a persona picker: choosing a merchant on /login sets
 * this signed cookie. Every Numeral call then takes the merchant id from here
 * and never from a query string or form field, which is the one rule a real
 * platform integration must keep: the browser never chooses whose data it
 * sees.
 */
export interface MerchantSession {
  merchantId?: string
  merchantName?: string
}

const SESSION_COOKIE = "tundra_session"

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET?.trim()
  return {
    cookieName: SESSION_COOKIE,
    // A fixed development secret keeps `bun dev` zero-config; production must set its own.
    password:
      password && password.length >= 32
        ? password
        : "tundra-demo-development-secret-please-override-in-prod",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }
}

export async function getSession() {
  const jar = await cookies()
  return getIronSession<MerchantSession>(jar, sessionOptions())
}

/** The signed-in merchant, or a redirect to the picker. */
export async function requireMerchant(): Promise<{ merchantId: string; merchantName: string }> {
  const session = await getSession()
  if (!session.merchantId) {
    redirect("/login")
  }
  return { merchantId: session.merchantId, merchantName: session.merchantName ?? session.merchantId }
}
