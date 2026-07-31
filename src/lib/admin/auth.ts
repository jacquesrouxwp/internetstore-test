import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  isAdminPublicPath,
  signAdminSession,
  verifyAdminSession,
} from "./session";

// Re-export so existing imports from "@/lib/admin/auth" keep working.
export { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, isAdminPublicPath };

/**
 * Demo credentials when Supabase is not configured. In production the weak
 * default password is disabled — an ADMIN_PASSWORD must be set explicitly, or
 * this returns null (env-credential login off).
 */
export function getDemoCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.ADMIN_EMAIL || "admin@pro-optics.ua";
  const password = process.env.ADMIN_PASSWORD;
  if (password) return { email, password };
  if (process.env.NODE_ENV !== "production") {
    return { email, password: "admin123" };
  }
  return null;
}

export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** True only for a valid, signed, unexpired session cookie. */
export async function hasAdminCookie(req?: NextRequest): Promise<boolean> {
  const value = req
    ? req.cookies.get(ADMIN_COOKIE)?.value
    : cookies().get(ADMIN_COOKIE)?.value;
  return verifyAdminSession(value);
}

/**
 * Check if Supabase user has admin role.
 * Accepts: app_metadata.role / user_metadata.role === "admin"
 * or email matches ADMIN_EMAIL (fallback).
 */
export function isAdminUser(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): boolean {
  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;
  if (appRole === "admin" || userRole === "admin") return true;

  const adminEmail = (
    process.env.ADMIN_EMAIL ||
    "admin@pro-optics.ua"
  ).toLowerCase();
  if (user.email && user.email.toLowerCase() === adminEmail) return true;

  // Comma-separated allow-list
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && allow.includes(user.email.toLowerCase())) return true;

  return false;
}

/**
 * Set the signed session cookie. Returns false when no server secret is
 * available to sign (production misconfiguration) — the caller must surface an
 * error instead of pretending the login succeeded.
 */
export async function setAdminCookie(res: NextResponse): Promise<boolean> {
  const token = await signAdminSession();
  if (!token) return false;
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return true;
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

/**
 * API route guard. Returns null if authorized, or a 401 JSON response.
 * Uses the signed admin session cookie.
 */
export async function requireAdminApi(
  req: NextRequest
): Promise<NextResponse | null> {
  if (await hasAdminCookie(req)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
