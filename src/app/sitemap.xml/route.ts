import { GET as apiGet } from "@/app/api/seo/sitemap/route";

/**
 * Public /sitemap.xml — re-exports pure API XML handler.
 * Middleware + vercel.json also rewrite here → /api/seo/sitemap.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 3600;

export function GET() {
  return apiGet();
}
