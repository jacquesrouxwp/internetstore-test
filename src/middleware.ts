import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  ADMIN_COOKIE,
  isAdminPublicPath,
  verifyAdminSession,
} from "./lib/admin/session";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    "/((?!api|_next|_vercel|demo|.*\\..*).*)",
  ],
};
