import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeXml, renderSitemapXml, type SitemapEntry } from "./sitemap-data";

describe("renderSitemapXml", () => {
  it("emits pure XML without script", () => {
    const xml = renderSitemapXml([
      {
        loc: "https://pro-optics.com.ua/product/test",
        lastmod: "2026-01-01T00:00:00.000Z",
        changefreq: "weekly",
        priority: 0.7,
      },
    ]);
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
    assert.doesNotMatch(xml, /<script/i);
    assert.doesNotMatch(xml, /<!DOCTYPE/i);
    assert.match(xml, /<loc>https:\/\/pro-optics\.com\.ua\/product\/test<\/loc>/);
  });

  it("includes image:image with absolute URLs and image namespace", () => {
    const entries: SitemapEntry[] = [
      {
        loc: "https://pro-optics.com.ua/product/hikmicro-lynx-lh19-3-0",
        priority: 0.7,
        images: [
          "https://pro-optics.com.ua/products/hikmicro-lynx-lh19-3-0.jpg",
          "https://xxx.supabase.co/storage/v1/object/public/products/a.webp",
        ],
      },
    ];
    const xml = renderSitemapXml(entries);
    assert.match(
      xml,
      /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/
    );
    assert.match(xml, /<image:image>/);
    assert.match(
      xml,
      /<image:loc>https:\/\/pro-optics\.com\.ua\/products\/hikmicro-lynx-lh19-3-0\.jpg<\/image:loc>/
    );
    assert.match(
      xml,
      /<image:loc>https:\/\/xxx\.supabase\.co\/storage\/v1\/object\/public\/products\/a\.webp<\/image:loc>/
    );
    assert.doesNotMatch(xml, /<script/i);
  });

  it("skips non-absolute image URLs", () => {
    const xml = renderSitemapXml([
      {
        loc: "https://pro-optics.com.ua/product/x",
        images: ["/relative.jpg", "not-a-url"],
      },
    ]);
    // Namespace may still be present if images array was non-empty but all skipped —
    // relative ones are skipped in render; hasImages is true if array non-empty
    assert.doesNotMatch(xml, /<image:loc>\/relative/);
    assert.doesNotMatch(xml, /<image:loc>not-a-url/);
  });

  it("escapes XML special chars in loc", () => {
    assert.equal(escapeXml(`a&b<"'>`), "a&amp;b&lt;&quot;&apos;&gt;");
  });
});
