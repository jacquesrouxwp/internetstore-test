/**
 * Pure XML sitemap alias — never HTML, never <script>.
 * Public canonical URL: /sitemap.xml (Next Metadata app/sitemap.ts).
 * This path is for manual checks / monitoring with hard strip.
 */
import { sitemapXmlResponse } from "@/lib/sitemap-xml-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  return sitemapXmlResponse();
}
