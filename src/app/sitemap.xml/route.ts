import { getSiteUrl } from "@/lib/site-url";
import {
  buildSitemapEntries,
  renderSitemapXml,
} from "@/lib/sitemap-data";

/**
 * GET /sitemap.xml
 * Pure XML only: <?xml> + <urlset> + <url>… — no HTML, no <script>.
 * Must stay a Route Handler returning `new Response(xml)` (never JSX).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 3600;

const HEADERS: HeadersInit = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
};

function fallbackXml(base: string): string {
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

    // Absolute hard strip if anything leaked (should never happen)
    xml = xml
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<script\b[^>]*\/>/gi, "")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      .replace(/<\/?html[\s\S]*?>/gi, "")
      .trim();

    if (!xml.endsWith("\n")) xml += "\n";

    if (
      !xml.startsWith("<?xml") ||
      !xml.includes("<urlset") ||
      /<script[\s>/]/i.test(xml) ||
      /<!DOCTYPE/i.test(xml)
    ) {
      console.error("[sitemap.xml] sanitized body still invalid — fallback");
      return new Response(fallbackXml(base), { status: 200, headers: HEADERS });
    }

    return new Response(xml, { status: 200, headers: HEADERS });
  } catch (e) {
    console.error("[sitemap.xml]", e);
    return new Response(fallbackXml(base), { status: 200, headers: HEADERS });
  }
}
