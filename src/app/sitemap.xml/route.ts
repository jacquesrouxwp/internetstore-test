import { getSiteUrl } from "@/lib/site-url";
import {
  buildSitemapEntries,
  renderSitemapXml,
} from "@/lib/sitemap-data";

/**
 * Pure XML sitemap — Route Handler, not MetadataRoute.
 * Guarantees body is only xml declaration + <urlset> + <url> nodes
 * (no layout HTML, no analytics <script/>, no React stream noise).
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const base = getSiteUrl();
  const entries = await buildSitemapEntries(base);
  const xml = renderSitemapXml(entries);

  // Hard guard: never ship non-XML if something goes wrong upstream
  if (
    !xml.startsWith("<?xml") ||
    !xml.includes("<urlset") ||
    /<script[\s>/]/i.test(xml)
  ) {
    console.error("[sitemap.xml] refused invalid body");
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        `  <url><loc>${base}</loc></url>\n` +
        "</urlset>\n",
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
