/**
 * Shared pure-XML Response builder for sitemap endpoints.
 * No React. Strips any accidental HTML/script.
 */
import { getSiteUrl } from "@/lib/site-url";
import {
  buildSitemapEntries,
  renderSitemapXml,
} from "@/lib/sitemap-data";

const HEADERS: HeadersInit = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Disposition": 'inline; filename="sitemap.xml"',
};

function fallbackXml(base: string): string {
  const safe = base.replace(/[<>&'"]/g, "");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `  <url>\n    <loc>${safe}</loc>\n  </url>\n` +
    "</urlset>\n"
  );
}

export function forcePureSitemapXml(xml: string, base: string): string {
  let out = String(xml ?? "");

  out = out
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<\/?html\b[^>]*>/gi, "")
    .replace(/<\/?head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body\b[^>]*>/gi, "")
    .replace(/<\/?body\b[^>]*\/>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const urlsetOpen = out.match(/<urlset\b[^>]*>/i);
  if (urlsetOpen && urlsetOpen.index != null) {
    const afterOpen = out.slice(urlsetOpen.index + urlsetOpen[0].length);
    const firstUrl = afterOpen.search(/<url\b/i);
    const closeIdx = out.toLowerCase().lastIndexOf("</urlset>");
    if (firstUrl >= 0 && closeIdx > urlsetOpen.index) {
      const openTag = urlsetOpen[0];
      const urlsBlock = afterOpen
        .slice(firstUrl, closeIdx - (urlsetOpen.index + urlsetOpen[0].length))
        .replace(/<script\b[\s\S]*?(<\/script>|\/>)/gi, "")
        .trim();
      out =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        openTag +
        "\n" +
        urlsBlock +
        "\n</urlset>\n";
    }
  }

  out = out.trim();
  if (!out.startsWith("<?xml")) {
    out = '<?xml version="1.0" encoding="UTF-8"?>\n' + out;
  }
  if (!out.endsWith("\n")) out += "\n";

  if (
    !out.includes("<urlset") ||
    !out.includes("</urlset>") ||
    /<script[\s>/]/i.test(out) ||
    /<!DOCTYPE/i.test(out) ||
    /<html[\s>]/i.test(out)
  ) {
    return fallbackXml(base);
  }
  return out;
}

export async function sitemapXmlResponse(): Promise<Response> {
  const base = getSiteUrl();
  try {
    const entries = await buildSitemapEntries(base);
    const raw = renderSitemapXml(entries);
    const xml = forcePureSitemapXml(raw, base);
    return new Response(Buffer.from(xml, "utf8"), {
      status: 200,
      headers: HEADERS,
    });
  } catch (e) {
    console.error("[sitemap]", e);
    return new Response(Buffer.from(fallbackXml(base), "utf8"), {
      status: 200,
      headers: HEADERS,
    });
  }
}
