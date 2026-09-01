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

  // 301: old Vercel deploy host → canonical domain (avoid duplicate index).
  // Escape hatch: when the canonical domain cannot resolve (DNS zone lost at the
  // registrar's provider, for example) this redirect makes the *.vercel.app URL
  // bounce to a dead host too, leaving the shop with no reachable address at all.
  // Set DISABLE_CANONICAL_REDIRECT=1 in Vercel to keep trading on the .vercel.app
  // URL until DNS is restored, then remove it — canonical tags keep pointing at
  // the real domain meanwhile, so this does not create a duplicate index.
  if (
    process.env.DISABLE_CANONICAL_REDIRECT !== "1" &&
    (host === LEGACY_VERCEL_HOST ||
      (host.endsWith(".vercel.app") && host.includes("optics-shop-skeleton")))
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
