"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { GATE_COOKIE, GATE_COOKIE_MAX_AGE_SECONDS, hashPasscode, safeNextPath } from "./gate-cookie"

export async function unlockGate(formData: FormData): Promise<void> {
  const expected = process.env.DEMO_PASSCODE?.trim()
  const next = safeNextPath(formData.get("next")?.toString())
  if (!expected) {
    redirect(next)
  }
  const submitted = formData.get("passcode")
  if (typeof submitted !== "string" || submitted.trim() !== expected) {
    const retry = new URLSearchParams({ next, error: "1" })
    redirect(`/gate?${retry.toString()}`)
  }
  const jar = await cookies()
  jar.set(GATE_COOKIE, await hashPasscode(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GATE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  })
  redirect(next)
}
