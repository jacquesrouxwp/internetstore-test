/**
 * Google Merchant Center feed — pure XML RSS 2.0 + xmlns:g.
 * https://pro-optics.com.ua/feed/google-merchant.xml
 * Optional: ?lang=uk|ru (default uk)
 */
import {
  buildGoogleMerchantXml,
  forcePureMerchantXml,
  type MerchantLocale,
} from "@/lib/google-merchant-feed";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const HEADERS: HeadersInit = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Disposition": 'inline; filename="google-merchant.xml"',
};

function parseLocale(req: Request): MerchantLocale {
  try {
    const url = new URL(req.url);
    const raw = (url.searchParams.get("lang") || url.searchParams.get("locale") || "uk")
      .trim()
      .toLowerCase();
    return raw === "ru" ? "ru" : "uk";
  } catch {
    return "uk";
  }
}

export async function GET(req: Request) {
  const locale = parseLocale(req);
  try {
    const raw = await buildGoogleMerchantXml(locale);
    const xml = forcePureMerchantXml(raw);
    if (!xml.includes("<rss") || /<script[\s>/]/i.test(xml)) {
      throw new Error("invalid merchant xml");
    }
    return new Response(Buffer.from(xml, "utf8"), {
      status: 200,
      headers: HEADERS,
    });
  } catch (e) {
    console.error("[merchant-feed]", e);
    const fallback =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
      "  <channel>\n" +
      "    <title>Pro-Optics</title>\n" +
      "    <link>https://pro-optics.com.ua</link>\n" +
      "    <description>Feed temporarily unavailable</description>\n" +
      "  </channel>\n" +
      "</rss>\n";
    return new Response(Buffer.from(fallback, "utf8"), {
      status: 200,
      headers: HEADERS,
    });
  }
}
