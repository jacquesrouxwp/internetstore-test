import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { ADMIN_COOKIE, isAdminPublicPath } from "./lib/admin/auth";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin/* (except login page itself)
  if (pathname.startsWith("/admin")) {
    if (!isAdminPublicPath(pathname)) {
      const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
      const secret = process.env.ADMIN_SESSION_SECRET;
      const ok =
        cookie === "1" || (Boolean(secret) && cookie === secret);

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
