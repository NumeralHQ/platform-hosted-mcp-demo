import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/app/gate/gate-cookie";
import {
  allowedEmailDomains,
  gateMethods,
  pkceChallenge,
  randomToken,
} from "@/lib/staff-gate";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_VERIFIER_COOKIE = "oauth_verifier";
export const OAUTH_NEXT_COOKIE = "oauth_next";
const TEN_MINUTES = 60 * 10;

/**
 * Step 1 of Google sign-in: send the viewer to Google with a fresh state and a
 * PKCE challenge, both remembered in short-lived httpOnly cookies. `hd` hints
 * the Workspace domain so Google pre-selects the right account; the real check
 * happens on the ID token in the callback.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!gateMethods().google) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = await pkceChallenge(verifier);
  const redirectUri = new URL(
    "/api/auth/google/callback",
    request.nextUrl.origin,
  ).toString();

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("prompt", "select_account");
  authorize.searchParams.set("access_type", "online");
  const [primaryDomain] = allowedEmailDomains();
  if (primaryDomain) {
    authorize.searchParams.set("hd", primaryDomain);
  }

  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: TEN_MINUTES,
    path: "/",
  };
  jar.set(OAUTH_STATE_COOKIE, state, options);
  jar.set(OAUTH_VERIFIER_COOKIE, verifier, options);
  jar.set(OAUTH_NEXT_COOKIE, next, options);
  return NextResponse.redirect(authorize);
}
