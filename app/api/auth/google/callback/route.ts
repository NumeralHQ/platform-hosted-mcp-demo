import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/app/gate/gate-cookie";
import {
  STAFF_COOKIE,
  STAFF_COOKIE_MAX_AGE_SECONDS,
  allowedEmailDomains,
  gateMethods,
  isAllowedEmail,
  signStaffCookie,
} from "@/lib/staff-gate";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "../start/route";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface TokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

/**
 * Step 2 of Google sign-in. Checks the state, exchanges the code (with the
 * PKCE verifier), verifies the ID token against Google's keys, and admits the
 * viewer only when the verified email is on an allowed domain. The staff
 * cookie is HMAC-signed so the edge proxy can trust it without a lookup.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const gateUrl = (error: string, next = "/"): NextResponse => {
    const url = new URL("/gate", request.url);
    url.searchParams.set("error", error);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };
  if (!gateMethods().google) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  const jar = await cookies();
  const next = safeNextPath(jar.get(OAUTH_NEXT_COOKIE)?.value);
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = jar.get(OAUTH_VERIFIER_COOKIE)?.value;
  for (const name of [
    OAUTH_STATE_COOKIE,
    OAUTH_VERIFIER_COOKIE,
    OAUTH_NEXT_COOKIE,
  ]) {
    jar.delete(name);
  }

  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    return gateUrl("oauth", next);
  }
  const code = params.get("code");
  const state = params.get("state");
  if (
    !code ||
    !state ||
    !expectedState ||
    !verifier ||
    state !== expectedState
  ) {
    return gateUrl("state", next);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = new URL(
    "/api/auth/google/callback",
    request.nextUrl.origin,
  ).toString();
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  const tokens = (await tokenResponse.json()) as TokenResponse;
  if (!tokenResponse.ok || !tokens.id_token) {
    return gateUrl("oauth", next);
  }

  let email: string | undefined;
  let name: string | undefined;
  let emailVerified: boolean | undefined;
  try {
    const { payload } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    email = typeof payload.email === "string" ? payload.email : undefined;
    name = typeof payload.name === "string" ? payload.name : undefined;
    emailVerified = payload.email_verified === true;
  } catch {
    return gateUrl("oauth", next);
  }

  if (
    !email ||
    !emailVerified ||
    !isAllowedEmail(email, allowedEmailDomains())
  ) {
    return gateUrl("domain", next);
  }

  const exp = Math.floor(Date.now() / 1000) + STAFF_COOKIE_MAX_AGE_SECONDS;
  jar.set(
    STAFF_COOKIE,
    await signStaffCookie({
      email: email.toLowerCase(),
      name: name ?? null,
      exp,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: STAFF_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    },
  );
  return NextResponse.redirect(new URL(next, request.url));
}
