import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractListingProductUrls,
  imagesShareSameFolder,
  looksLikeMatchingGallery,
} from "./optics-pro-scraper";

describe("extractListingProductUrls", () => {
  it("pulls product urls from schema.org microdata links", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <link itemprop="url" href="ua/teplovizori/x/model-a"/>
      </div>
      <div itemscope itemtype="https://schema.org/Product">
        <link itemprop="url" href="/ua/teplovizori/x/model-b" />
      </div>
    `;
    assert.deepEqual(extractListingProductUrls(html), [
      "ua/teplovizori/x/model-a",
      "ua/teplovizori/x/model-b",
    ]);
  });

  it("returns an empty array when there are no product links", () => {
    assert.deepEqual(extractListingProductUrls("<html></html>"), []);
  });
});

describe("imagesShareSameFolder", () => {
  it("true for a normal single-model gallery", () => {
    const base =
      "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionnyj-monokulyar/hikmicro/lynx-3-0/";
    assert.equal(
      imagesShareSameFolder([
        `${base}teplovizor-hikmicro-lynx-le10-30-750x750.jpg`,
        `${base}teplovizor-hikmicro-lynx-le10-30-1-750x750.jpg`,
      ]),
      true
    );
  });

  it("false when an image comes from an unrelated brand's folder", () => {
    assert.equal(
      imagesShareSameFolder([
        "https://www.optics-pro.com.ua/image/cache/catalog/teplovizori/agm/agm-taipan-tm15384-0-750x750.jpg",
        "https://www.optics-pro.com.ua/image/cache/catalog/teplovizori/hikmicro/hikmicro-6-750x750.jpg",
      ]),
      false
    );
  });
});

describe("looksLikeMatchingGallery", () => {
  // Confirmed live on optics-pro.com.ua (2026-08-01): AGM Taipan TM15384's
  // own gallery JSON-LD includes a photo borrowed from the sibling TM10256
  // model -- same brand folder, so imagesShareSameFolder alone misses it.
  // Matching against the donor's JSON-LD sku/model field directly was tried
  // and reverted: some products' sku is an opaque internal part number
  // (e.g. AGM Seeker's sku "AA-0013456") that never appears in any image
  // filename, which produced ~70% false positives across the real catalog.
  it("flags a gallery whose distinguishing number never appears in any photo", () => {
    const images = [
      "https://www.optics-pro.com.ua/image/cache/catalog/teplovizori/agm/agm-taipan-tm10256-3-750x750.jpg",
    ];
    assert.equal(
      looksLikeMatchingGallery(
        images,
        "ua/teplovizori/teplovizory-agm/teplovizor-agm-taipan-tm15384"
      ),
      false
    );
  });

  it("does not flag when at least one photo carries the product's own number", () => {
    const images = [
      "https://www.optics-pro.com.ua/image/cache/catalog/teplovizori/agm/agm-taipan-tm15384-0-750x750.jpg",
      "https://www.optics-pro.com.ua/image/cache/catalog/teplovizori/agm/agm-taipan-tm10256-3-750x750.jpg",
    ];
    assert.equal(
      looksLikeMatchingGallery(
        images,
        "ua/teplovizori/teplovizory-agm/teplovizor-agm-taipan-tm15384"
      ),
      true
    );
  });

  it("does not flag real products whose sku is an opaque internal code", () => {
    // AGM Seeker: sku/model = "AA-0013456", never appears in any filename --
    // the URL slug's own digits ("15", "384") are what carry the signal.
    const images = [
      "https://www.optics-pro.com.ua/image/cache/catalog/teplovizori/agm/agm-seeker-15-384-2-750x750.jpg",
    ];
    assert.equal(
      looksLikeMatchingGallery(
        images,
        "ua/teplovizori/teplovizory-agm/teplovizor-agm-seeker-15-384"
      ),
      true
    );
  });

  it("does not flag when the slug has no distinguishing numbers", () => {
    const images = ["https://example.com/x/y.jpg"];
    assert.equal(
      looksLikeMatchingGallery(images, "ua/aksesuary/chexol-universalnyi"),
      true
    );
  });
});
