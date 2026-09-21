import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../../proxy";
import {
  STAFF_COOKIE,
  allowedEmailDomains,
  gateMethods,
  gateMode,
  isAllowedEmail,
  pkceChallenge,
  signStaffCookie,
  verifyStaffCookie,
} from "@/lib/staff-gate";
import {
  GATE_COOKIE,
  hashPasscode,
  isGateOpenPath,
  safeNextPath,
} from "../gate-cookie";

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(`http://demo.test${path}`, { headers });
}

const SECRET = "test-session-secret-that-is-at-least-32-chars-long";
const NOW = 1_800_000_000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("gate helpers", () => {
  test("hash is a stable 64-char hex digest", async () => {
    const a = await hashPasscode("test");
    const b = await hashPasscode("test");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPasscode("other")).not.toBe(a);
  });

  test("next path only allows same-origin relative paths", () => {
    expect(safeNextPath("/dashboard/tax?x=1")).toBe("/dashboard/tax?x=1");
    expect(safeNextPath("//evil.test")).toBe("/");
    expect(safeNextPath("https://evil.test")).toBe("/");
    expect(safeNextPath("/gate?next=/x")).toBe("/");
    expect(safeNextPath("/api/auth/google/start")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });

  test("open paths", () => {
    expect(isGateOpenPath("/gate")).toBe(true);
    expect(isGateOpenPath("/dev/integration")).toBe(true);
    expect(isGateOpenPath("/api/health")).toBe(true);
    expect(isGateOpenPath("/api/auth/google/callback")).toBe(true);
    expect(isGateOpenPath("/gateway")).toBe(false);
    expect(isGateOpenPath("/dashboard/tax")).toBe(false);
  });
});

describe("staff gate", () => {
  test("methods follow configuration and can both be on", () => {
    expect(gateMode({})).toBe("open");
    expect(gateMethods({})).toEqual({ google: false, passcode: false });
    expect(gateMethods({ DEMO_PASSCODE: "x" })).toEqual({
      google: false,
      passcode: true,
    });
    expect(
      gateMethods({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "s",
        DEMO_PASSCODE: "x",
      }),
    ).toEqual({ google: true, passcode: true });
    // A client id without its secret is not a usable method.
    expect(gateMethods({ GOOGLE_CLIENT_ID: "id" })).toEqual({
      google: false,
      passcode: false,
    });
    expect(
      gateMode({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }),
    ).toBe("gated");
  });

  test("allowed domains default to numeralhq.com and parse a comma list", () => {
    expect(allowedEmailDomains({})).toEqual(["numeralhq.com"]);
    expect(
      allowedEmailDomains({
        ALLOWED_EMAIL_DOMAINS: " @Numeralhq.com, partner.example ",
      }),
    ).toEqual(["numeralhq.com", "partner.example"]);
  });

  test("email domain check is exact", () => {
    const domains = ["numeralhq.com"];
    expect(isAllowedEmail("jake@numeralhq.com", domains)).toBe(true);
    expect(isAllowedEmail("Jake@NumeralHQ.com", domains)).toBe(true);
    expect(isAllowedEmail("jake@numeralhq.com.evil.test", domains)).toBe(false);
    expect(isAllowedEmail("jake@sub.numeralhq.com", domains)).toBe(false);
    expect(isAllowedEmail("numeralhq.com", domains)).toBe(false);
    expect(isAllowedEmail(null, domains)).toBe(false);
  });

  test("staff cookie round-trips, rejects tampering, expiry, and disallowed domains", async () => {
    const env = { SESSION_SECRET: SECRET };
    const cookie = await signStaffCookie(
      { email: "jake@numeralhq.com", name: "Jake", exp: NOW + 60 },
      env,
    );
    expect(await verifyStaffCookie(cookie, env, NOW)).toEqual({
      email: "jake@numeralhq.com",
      name: "Jake",
      exp: NOW + 60,
    });
    expect(
      await verifyStaffCookie(
        cookie,
        { SESSION_SECRET: `${SECRET}-other` },
        NOW,
      ),
    ).toBeNull();
    const [payload, signature] = cookie.split(".");
    expect(
      await verifyStaffCookie(`${payload}x.${signature}`, env, NOW),
    ).toBeNull();
    expect(await verifyStaffCookie(cookie, env, NOW + 61)).toBeNull();
    expect(
      await verifyStaffCookie(
        cookie,
        { ...env, ALLOWED_EMAIL_DOMAINS: "other.test" },
        NOW,
      ),
    ).toBeNull();
    expect(await verifyStaffCookie("garbage", env, NOW)).toBeNull();
    expect(await verifyStaffCookie(undefined, env, NOW)).toBeNull();
  });

  test("PKCE challenge is base64url SHA-256 of the verifier", async () => {
    const challenge = await pkceChallenge("verifier");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await pkceChallenge("verifier")).toBe(challenge);
  });
});

describe("proxy", () => {
  test("is inert when nothing is configured", async () => {
    vi.stubEnv("DEMO_PASSCODE", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const response = await proxy(request("/dashboard/tax"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("passcode mode: redirects to /gate with the original path when the cookie is missing", async () => {
    vi.stubEnv("DEMO_PASSCODE", "test");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const response = await proxy(
      request("/dashboard/tax/filings?status=filed"),
    );
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/gate");
    expect(location.searchParams.get("next")).toBe(
      "/dashboard/tax/filings?status=filed",
    );
  });

  test("passcode mode: rejects the wrong hash, passes the right one", async () => {
    vi.stubEnv("DEMO_PASSCODE", "test");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect(
      (
        await proxy(
          request(
            "/dashboard",
            `${GATE_COOKIE}=${await hashPasscode("wrong")}`,
          ),
        )
      ).status,
    ).toBe(307);
    const ok = await proxy(
      request("/dashboard", `${GATE_COOKIE}=${await hashPasscode("test")}`),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("x-middleware-next")).toBe("1");
  });

  test("google + passcode both configured: either cookie passes", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubEnv("DEMO_PASSCODE", "test");
    vi.stubEnv("SESSION_SECRET", SECRET);
    expect((await proxy(request("/dashboard/tax"))).status).toBe(307);
    expect(
      (
        await proxy(
          request("/dashboard", `${GATE_COOKIE}=${await hashPasscode("test")}`),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await proxy(
          request(
            "/dashboard",
            `${GATE_COOKIE}=${await hashPasscode("wrong")}`,
          ),
        )
      ).status,
    ).toBe(307);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const staff = await signStaffCookie(
      { email: "jake@numeralhq.com", name: null, exp },
      { SESSION_SECRET: SECRET },
    );
    const ok = await proxy(
      request("/dashboard/tax", `${STAFF_COOKIE}=${staff}`),
    );
    expect(ok.status).toBe(200);
    const outsider = await signStaffCookie(
      { email: "x@evil.test", name: null, exp },
      { SESSION_SECRET: SECRET },
    );
    expect(
      (await proxy(request("/dashboard/tax", `${STAFF_COOKIE}=${outsider}`)))
        .status,
    ).toBe(307);
  });

  test("google only: the passcode cookie does not pass", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubEnv("DEMO_PASSCODE", "");
    expect(
      (
        await proxy(
          request("/dashboard", `${GATE_COOKIE}=${await hashPasscode("test")}`),
        )
      ).status,
    ).toBe(307);
  });

  test("leaves the gate, the auth routes, and the engineer page open", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect((await proxy(request("/gate?next=/dashboard"))).status).toBe(200);
    expect((await proxy(request("/api/auth/google/start"))).status).toBe(200);
    expect((await proxy(request("/dev/integration"))).status).toBe(200);
    expect((await proxy(request("/api/health"))).status).toBe(200);
  });
});
