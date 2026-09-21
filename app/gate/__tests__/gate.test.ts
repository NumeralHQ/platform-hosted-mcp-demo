import { afterEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "../../../proxy"
import { GATE_COOKIE, hashPasscode, isGateOpenPath, safeNextPath } from "../gate-cookie"

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers()
  if (cookie) {
    headers.set("cookie", cookie)
  }
  return new NextRequest(`http://demo.test${path}`, { headers })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("gate helpers", () => {
  test("hash is a stable 64-char hex digest", async () => {
    const a = await hashPasscode("test")
    const b = await hashPasscode("test")
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashPasscode("other")).not.toBe(a)
  })

  test("next path only allows same-origin relative paths", () => {
    expect(safeNextPath("/dashboard/tax?x=1")).toBe("/dashboard/tax?x=1")
    expect(safeNextPath("//evil.test")).toBe("/")
    expect(safeNextPath("https://evil.test")).toBe("/")
    expect(safeNextPath("/gate?next=/x")).toBe("/")
    expect(safeNextPath(undefined)).toBe("/")
  })

  test("open paths", () => {
    expect(isGateOpenPath("/gate")).toBe(true)
    expect(isGateOpenPath("/dev/integration")).toBe(true)
    expect(isGateOpenPath("/api/health")).toBe(true)
    expect(isGateOpenPath("/gateway")).toBe(false)
    expect(isGateOpenPath("/dashboard/tax")).toBe(false)
  })
})

describe("proxy", () => {
  test("is inert when DEMO_PASSCODE is unset", async () => {
    vi.stubEnv("DEMO_PASSCODE", "")
    const response = await proxy(request("/dashboard/tax"))
    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })

  test("redirects to /gate with the original path when the cookie is missing", async () => {
    vi.stubEnv("DEMO_PASSCODE", "test")
    const response = await proxy(request("/dashboard/tax/filings?status=filed"))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location") ?? "")
    expect(location.pathname).toBe("/gate")
    expect(location.searchParams.get("next")).toBe("/dashboard/tax/filings?status=filed")
  })

  test("rejects a cookie holding the wrong hash", async () => {
    vi.stubEnv("DEMO_PASSCODE", "test")
    const response = await proxy(request("/dashboard", `${GATE_COOKIE}=${await hashPasscode("wrong")}`))
    expect(response.status).toBe(307)
  })

  test("passes when the cookie holds the passcode hash", async () => {
    vi.stubEnv("DEMO_PASSCODE", "test")
    const response = await proxy(request("/dashboard", `${GATE_COOKIE}=${await hashPasscode("test")}`))
    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })

  test("leaves the gate and the engineer page open", async () => {
    vi.stubEnv("DEMO_PASSCODE", "test")
    expect((await proxy(request("/gate?next=/dashboard"))).status).toBe(200)
    expect((await proxy(request("/dev/integration"))).status).toBe(200)
    expect((await proxy(request("/api/health"))).status).toBe(200)
  })
})
