import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  ADMIN_COOKIE,
  isAdminPublicPath,
  verifyAdminSession,
} from "./lib/admin/session";
import { CANONICAL_SITE_ORIGIN, LEGACY_VERCEL_HOST } from "./lib/site-url";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  // 301: old Vercel deploy host → canonical domain (avoid duplicate index)
  if (
    host === LEGACY_VERCEL_HOST ||
    (host.endsWith(".vercel.app") && host.includes("optics-shop-skeleton"))
  ) {
    const dest = new URL(pathname + req.nextUrl.search, CANONICAL_SITE_ORIGIN);
    return NextResponse.redirect(dest, 301);
  }

  // Protect /admin/* (except login page itself)
  if (pathname.startsWith("/admin")) {
    if (!isAdminPublicPath(pathname)) {
      const token = req.cookies.get(ADMIN_COOKIE)?.value;
      const ok = await verifyAdminSession(token);

      if (!ok) {
        const login = new URL("/admin", req.url);
        login.searchParams.set("from", pathname);
        return NextResponse.redirect(login);
      }
    }
    return NextResponse.next();
  }

  // next-intl for the storefront
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/",
    "/(uk|ru)/:path*",
    "/admin",
    "/admin/:path*",
    // Exclude files with extensions (sitemap.xml, robots.txt, assets)
    "/((?!api|_next|_vercel|demo|.*\\..*).*)",
  ],
};
