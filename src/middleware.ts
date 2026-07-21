import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip i18n middleware for api, admin, demo, static assets
  matcher: [
    "/",
    "/(uk|ru)/:path*",
    "/((?!api|_next|_vercel|admin|demo|.*\\..*).*)",
  ],
};
