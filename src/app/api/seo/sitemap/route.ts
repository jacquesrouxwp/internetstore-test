import { getSiteUrl } from "@/lib/site-url";
import {
  buildSitemapEntries,
  renderSitemapXml,
} from "@/lib/sitemap-data";

/**
 * Pure XML body for /sitemap.xml (rewritten from middleware / vercel.json).
 * Lives under /api so it never touches React layouts, RSC, or analytics.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 3600;

const XML_HEADERS: HeadersInit = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
  // Prevent intermediaries from treating this as HTML
  "X-Robots-Tag": "noarchive",
};

function minimalXml(base: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `  <url>\n    <loc>${base}</loc>\n  </url>\n` +
    "</urlset>\n"
  );
}

export async function GET() {
  const base = getSiteUrl();
  try {
    const entries = await buildSitemapEntries(base);
    let xml = renderSitemapXml(entries);

    // Strip anything that is not pure sitemap XML (defense in depth)
    xml = xml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    xml = xml.replace(/<script\b[^>]*\/>/gi, "");
    xml = xml.trim() + "\n";

    if (
      !xml.startsWith("<?xml") ||
      !xml.includes("<urlset") ||
      /<script[\s>/]/i.test(xml)
    ) {
      console.error("[api/seo/sitemap] invalid body after sanitize");
      return new Response(minimalXml(base), {
        status: 200,
        headers: XML_HEADERS,
      });
    }

    return new Response(xml, { status: 200, headers: XML_HEADERS });
  } catch (e) {
    console.error("[api/seo/sitemap]", e);
    return new Response(minimalXml(base), {
      status: 200,
      headers: XML_HEADERS,
    });
  }
}
