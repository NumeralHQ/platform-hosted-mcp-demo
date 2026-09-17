"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SCENARIOS } from "@/lib/numeral/data-source"
import { SKINS } from "@/platform.config"
import { ADMIN_COOKIE, adminCookieValue, hasAdminCookie, tokenMatches } from "./admin-auth"

/**
 * The demo operator's controls. Every action re-checks the admin unlock: a
 * server action is a public endpoint, so the page's gate alone is not enough.
 * A valid unlock (cookie or the token in the form) refreshes the cookie, so
 * the redirect back to /admin lands unlocked without the query string.
 *
 * Cookie names match what `lib/numeral/index.ts` (`demo_mode`,
 * `demo_scenario`, `demo_simulate_unlinked`) and `lib/skin.ts` (`demo_skin`)
 * read on every request.
 */
const DEMO_COOKIES = ["demo_mode", "demo_scenario", "demo_simulate_unlinked", "demo_skin"] as const

const MODES = ["live", "replay", "auto"] as const

function cookieOptions(): { httpOnly: boolean; sameSite: "lax"; path: string; secure: boolean } {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  }
}

async function requireAdmin(token: string | null): Promise<void> {
  if (!tokenMatches(token) && !(await hasAdminCookie())) {
    redirect("/admin")
  }
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, adminCookieValue(), { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 })
}

function tokenFrom(formData: FormData): string | null {
  const token = formData.get("token")
  return typeof token === "string" ? token : null
}

async function setOrClear(name: (typeof DEMO_COOKIES)[number], value: string | null): Promise<void> {
  const jar = await cookies()
  if (value === null) {
    jar.delete(name)
  } else {
    jar.set(name, value, cookieOptions())
  }
}

/** Only sets the admin cookie; for the "remember this browser" button after a token visit. */
export async function rememberAdmin(formData: FormData): Promise<void> {
  await requireAdmin(tokenFrom(formData))
  redirect("/admin")
}

export async function setMode(formData: FormData): Promise<void> {
  await requireAdmin(tokenFrom(formData))
  const mode = formData.get("mode")
  if (typeof mode !== "string") {
    throw new Error("mode is required")
  }
  const known = MODES.find((m) => m === mode)
  await setOrClear("demo_mode", known ?? null)
  redirect("/admin")
}

export async function setScenario(formData: FormData): Promise<void> {
  await requireAdmin(tokenFrom(formData))
  const scenario = formData.get("scenario")
  if (typeof scenario !== "string") {
    throw new Error("scenario is required")
  }
  const known = SCENARIOS.find((s) => s === scenario)
  await setOrClear("demo_scenario", known ?? null)
  redirect("/admin")
}

export async function setSimulateUnlinked(enabled: boolean, token: string | null): Promise<void> {
  await requireAdmin(token)
  await setOrClear("demo_simulate_unlinked", enabled ? "1" : null)
  redirect("/admin")
}

export async function setSkin(formData: FormData): Promise<void> {
  await requireAdmin(tokenFrom(formData))
  const skin = formData.get("skin")
  if (typeof skin !== "string") {
    throw new Error("skin is required")
  }
  await setOrClear("demo_skin", skin in SKINS ? skin : null)
  redirect("/admin")
}

export async function resetDemoCookies(formData: FormData): Promise<void> {
  await requireAdmin(tokenFrom(formData))
  const jar = await cookies()
  for (const name of DEMO_COOKIES) {
    jar.delete(name)
  }
  redirect("/admin")
}
