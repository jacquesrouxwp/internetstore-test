/**
 * Canonical /sitemap.xml — pure XML with Google image: tags.
 * Replaces MetadataRoute sitemap so we can emit xmlns:image.
 */
import { sitemapXmlResponse } from "@/lib/sitemap-xml-response";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  return sitemapXmlResponse();
}
