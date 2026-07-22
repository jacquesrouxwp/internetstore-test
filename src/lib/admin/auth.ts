import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "optics_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Demo credentials when Supabase is not configured */
export function getDemoCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || "admin@pro-optics.ua",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
}

export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Accept cookie session (demo) or secret match */
export function hasAdminCookie(req?: NextRequest): boolean {
  const value = req
    ? req.cookies.get(ADMIN_COOKIE)?.value
    : cookies().get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  if (value === "1") return true;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && value === secret) return true;
  return false;
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

export function setAdminCookie(res: NextResponse) {
  const value = process.env.ADMIN_SESSION_SECRET || "1";
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
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
 * Uses admin cookie (set after successful login with role check).
 */
export function requireAdminApi(req: NextRequest): NextResponse | null {
  if (hasAdminCookie(req)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Paths under /admin that do not require auth */
export function isAdminPublicPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return true;
  if (pathname.startsWith("/admin/login")) return true;
  return false;
}
