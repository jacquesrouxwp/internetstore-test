/**
 * Signed admin session token — Edge-safe (Web Crypto only, no node:crypto, no
 * next/headers), so it can be imported by both the Edge middleware and Node
 * route handlers / server components.
 *
 * The cookie carries an HMAC-SHA256 signed, expiring token instead of a
 * guessable constant. This closes the `optics_admin=1` backdoor: a forged
 * cookie cannot produce a valid signature without the server secret.
 *
 * Token format:  base64url(payload).base64url(hmac(payload))
 *   payload = {"v":1,"iat":<sec>,"exp":<sec>}
 */

export const ADMIN_COOKIE = "optics_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const TOKEN_TTL_SEC = ADMIN_COOKIE_MAX_AGE;
const TOKEN_VERSION = 1;

/**
 * Server secret backing the signature. First non-empty of an explicit session
 * secret, the admin password, or the Supabase service-role key — so realistic
 * deployments have an unguessable key without extra config. In production with
 * nothing configured, returns "" and signing/verification fail closed (no valid
 * session can be minted), which is the safe default.
 */
function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process.env.NODE_ENV !== "production" ? "dev-insecure-admin-secret" : "")
  );
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64url(s: string): string {
  return bytesToB64url(encoder.encode(s));
}

function b64urlToStr(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return decoder.decode(bytes);
}

async function hmacB64url(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToB64url(new Uint8Array(sig));
}

/** Constant-time string comparison (avoids signature-timing leaks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Mint a signed session token. Returns null when no server secret is available
 * (production misconfiguration) — callers must treat that as "cannot log in".
 */
export async function signAdminSession(
  now: number = Date.now()
): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const iat = Math.floor(now / 1000);
  const payload = JSON.stringify({
    v: TOKEN_VERSION,
    iat,
    exp: iat + TOKEN_TTL_SEC,
  });
  const p = strToB64url(payload);
  const sig = await hmacB64url(p, secret);
  return `${p}.${sig}`;
}

/** Verify signature + version + expiry. Any tampering or absence → false. */
export async function verifyAdminSession(
  token: string | undefined | null,
  now: number = Date.now()
): Promise<boolean> {
  if (!token) return false;
  const secret = sessionSecret();
  if (!secret) return false;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmacB64url(p, secret);
  if (!timingSafeEqual(sig, expected)) return false;

  try {
    const payload = JSON.parse(b64urlToStr(p)) as {
      v?: number;
      exp?: number;
    };
    if (payload.v !== TOKEN_VERSION) return false;
    if (typeof payload.exp !== "number") return false;
    if (payload.exp * 1000 <= now) return false;
    return true;
  } catch {
    return false;
  }
}

/** Paths under /admin that do not require auth (the login screen itself). */
export function isAdminPublicPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return true;
  if (pathname.startsWith("/admin/login")) return true;
  return false;
}
