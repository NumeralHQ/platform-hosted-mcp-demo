/**
 * Who may view the hosted demo. Two methods, each enabled by configuration,
 * and a viewer needs to satisfy only one:
 *
 * - google:   `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` set. Viewers sign in
 *             with Google and must hold an email on an allowed domain
 *             (`ALLOWED_EMAIL_DOMAINS`, default `numeralhq.com`). This is how
 *             the Numeral dashboard itself signs staff in.
 * - passcode: `DEMO_PASSCODE` set. A shared passcode (see gate-cookie.ts).
 *
 * With neither set the site is open, which is what every local clone gets.
 *
 * Shared by `proxy.ts` (edge runtime) and the auth routes, so only Web Crypto
 * is used here: no Node imports.
 */

export type GateMode = "gated" | "open";

export interface GateMethods {
  /** Google sign-in restricted to allowed domains. */
  google: boolean;
  /** Shared passcode. */
  passcode: boolean;
}

export const STAFF_COOKIE = "demo_staff";
export const STAFF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Fallback so `bun run dev` needs no config; production must set SESSION_SECRET. */
const DEV_SECRET = "tundra-demo-development-secret-please-override-in-prod";

/**
 * The env keys this module reads. Structural (`process.env` satisfies it) so
 * tests can pass plain objects.
 */
export type GateEnv = Record<string, string | undefined>;

/**
 * Both methods can be on at the same time: a viewer passes if they satisfy
 * either one. That keeps the passcode working while Google is being set up
 * (registering the redirect URI on the OAuth client can lag the deploy).
 */
export function gateMethods(env: GateEnv = process.env): GateMethods {
  return {
    google: Boolean(
      env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim(),
    ),
    passcode: Boolean(env.DEMO_PASSCODE?.trim()),
  };
}

export function gateMode(env: GateEnv = process.env): GateMode {
  const methods = gateMethods(env);
  return methods.google || methods.passcode ? "gated" : "open";
}

export function allowedEmailDomains(env: GateEnv = process.env): string[] {
  const raw = env.ALLOWED_EMAIL_DOMAINS?.trim();
  const domains = (raw ? raw.split(",") : ["numeralhq.com"])
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter((domain) => domain.length > 0);
  return domains.length > 0 ? domains : ["numeralhq.com"];
}

/** Exact domain match on the part after the last "@"; no subdomain tricks. */
export function isAllowedEmail(
  email: string | null | undefined,
  domains: readonly string[],
): boolean {
  if (!email) {
    return false;
  }
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    return false;
  }
  const domain = email.slice(at + 1).toLowerCase();
  return domains.includes(domain);
}

export interface StaffSession {
  email: string;
  name: string | null;
  /** Unix seconds. */
  exp: number;
}

/** Web Crypto wants a view over a plain ArrayBuffer; copy to guarantee it. */
function toBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy;
}

function secretBytes(env: GateEnv): Uint8Array<ArrayBuffer> {
  const secret = env.SESSION_SECRET?.trim();
  return toBuffer(
    new TextEncoder().encode(
      secret && secret.length >= 32 ? secret : DEV_SECRET,
    ),
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(text: string): Uint8Array<ArrayBuffer> {
  const padded =
    text.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmacKey(env: GateEnv): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    secretBytes(env),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** `base64url(json).base64url(hmac)`; the proxy verifies it on every request. */
export async function signStaffCookie(
  session: StaffSession,
  env: GateEnv = process.env,
): Promise<string> {
  const payload = toBuffer(new TextEncoder().encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(env),
    payload,
  );
  return `${base64UrlEncode(payload)}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyStaffCookie(
  value: string | null | undefined,
  env: GateEnv = process.env,
  now: number = Math.floor(Date.now() / 1000),
): Promise<StaffSession | null> {
  if (!value) {
    return null;
  }
  const dot = value.indexOf(".");
  if (dot <= 0) {
    return null;
  }
  try {
    const payload = base64UrlDecode(value.slice(0, dot));
    const signature = base64UrlDecode(value.slice(dot + 1));
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env),
      signature,
      payload,
    );
    if (!valid) {
      return null;
    }
    const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (!isStaffSession(parsed) || parsed.exp <= now) {
      return null;
    }
    // The domain list may have changed since the cookie was issued.
    if (!isAllowedEmail(parsed.email, allowedEmailDomains(env))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isStaffSession(value: unknown): value is StaffSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.email === "string" &&
    (typeof record.name === "string" || record.name === null) &&
    typeof record.exp === "number"
  );
}

export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

/** PKCE S256 challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    toBuffer(new TextEncoder().encode(verifier)),
  );
  return base64UrlEncode(new Uint8Array(digest));
}
