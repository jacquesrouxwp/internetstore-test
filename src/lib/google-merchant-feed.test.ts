import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import {
  productToMerchantFields,
  productToMerchantItem,
  renderGoogleMerchantXml,
} from "./google-merchant-feed";

function baseProduct(over: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "hikmicro-lynx-lh19-3-0",
    sku: "HM-LH19",
    nameUk: "Тепловізор HikMicro LYNX LH19 3.0",
    nameRu: "Тепловизор HikMicro LYNX LH19 3.0",
    descriptionUk: "Компактний тепловізор для полювання та охорони з матрицею 384.",
    descriptionRu: "Компактный тепловизор для охоты и охраны с матрицей 384.",
    shortUk: null,
    shortRu: null,
    price: 45000,
    oldPrice: null,
    stock: 3,
    brandId: "b1",
    brandSlug: "hikmicro",
    brandName: "HikMicro",
    categoryId: "c1",
    categorySlug: "teplovizori",
    resolution: "384x288",
    deviceType: "mono",
    detectionRangeM: 900,
    rating: 4.8,
    reviewsCount: 12,
    isHit: true,
    isNew: false,
    isTop: true,
    isSale: false,
    images: ["/products/hikmicro-lynx-lh19-3-0.jpg"],
    specs: {},
    published: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("productToMerchantFields", () => {
  it("builds required Google attributes with absolute URLs", () => {
    const f = productToMerchantFields(
      baseProduct(),
      "uk",
      "https://pro-optics.com.ua"
    );
    assert.ok(f);
    assert.equal(f!.id, "HM-LH19");
    assert.equal(f!.title, "Тепловізор HikMicro LYNX LH19 3.0");
    assert.equal(f!.brand, "HikMicro");
    assert.equal(f!.condition, "new");
    assert.equal(f!.availability, "in_stock");
    assert.equal(f!.price, "45000.00 UAH");
    assert.equal(
      f!.link,
      "https://pro-optics.com.ua/product/hikmicro-lynx-lh19-3-0"
    );
    assert.equal(
      f!.image_link,
      "https://pro-optics.com.ua/products/hikmicro-lynx-lh19-3-0.jpg"
    );
    assert.equal(f!.identifier_exists, "no");
    assert.equal(f!.mpn, "HM-LH19");
    assert.ok(f!.google_product_category);
    assert.ok(f!.description.length >= 20);
  });

  it("sets out_of_stock and gtin when present", () => {
    const f = productToMerchantFields(
      baseProduct({
        stock: 0,
        specs: { EAN: "5901234123457" },
      }),
      "uk",
      "https://pro-optics.com.ua"
    );
    assert.equal(f!.availability, "out_of_stock");
    assert.equal(f!.gtin, "5901234123457");
    assert.equal(f!.identifier_exists, undefined);
  });

  it("skips products without images or brand", () => {
    assert.equal(
      productToMerchantFields(
        baseProduct({ images: [] }),
        "uk",
        "https://pro-optics.com.ua"
      ),
      null
    );
    assert.equal(
      productToMerchantFields(
        baseProduct({ brandName: null, brandSlug: null }),
        "uk",
        "https://pro-optics.com.ua"
      ),
      null
    );
  });
});

describe("renderGoogleMerchantXml", () => {
  it("emits RSS 2.0 with g namespace and no script", () => {
    const xml = renderGoogleMerchantXml([baseProduct()], {
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
    });
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
    assert.match(xml, /<g:id>HM-LH19<\/g:id>/);
    assert.match(xml, /<g:price>45000\.00 UAH<\/g:price>/);
    assert.doesNotMatch(xml, /<script/i);
    assert.doesNotMatch(xml, /<!DOCTYPE/i);
  });
});

describe("productToMerchantItem extras", () => {
  it("adds highlights and details from the spec sheet", () => {
    const item = productToMerchantItem(
      baseProduct({
        detectionRangeM: 1300,
        specs: {
          "Вага, г": "380",
          "Автономність, год": "6.5",
          "Об'єктив, мм": "25",
          NETD: "25 мК",
        },
      }),
      "uk",
      "https://pro-optics.com.ua",
    );
    assert.ok(item);
    const highlights = item!.highlights;
    assert.ok(highlights.some((h) => h.includes("384×288")));
    assert.ok(highlights.some((h) => h.includes("1300 м")));
    assert.ok(highlights.some((h) => h.includes("380 г")));
    assert.ok(highlights.some((h) => h.includes("6,5 год")));
    assert.ok(highlights.length <= 6);

    const details = item!.details;
    assert.ok(details.length >= 3);
    for (const d of details) {
      assert.ok(d.section && d.name && d.value);
    }
  });

  it("writes them as g:product_highlight and g:product_detail", () => {
    const xml = renderGoogleMerchantXml(
      [baseProduct({ detectionRangeM: 1300, specs: { "Вага, г": "380" } })],
      { locale: "uk", siteUrl: "https://pro-optics.com.ua" },
    );
    assert.match(xml, /<g:product_highlight>[^<]+<\/g:product_highlight>/);
    assert.match(xml, /<g:product_detail>\s*<g:section_name>/);
    assert.match(xml, /<g:attribute_name>[^<]+<\/g:attribute_name>/);
  });

  it("says nothing when the spec sheet says nothing", () => {
    // The model name is the last fallback for the lens, so an accessory with
    // no digits in its name is the honest "no data at all" case.
    const item = productToMerchantItem(
      baseProduct({
        nameUk: "Наглазник ATN",
        nameRu: "Наглазник ATN",
        resolution: null,
        detectionRangeM: null,
        specs: {},
      }),
      "uk",
      "https://pro-optics.com.ua",
    );
    assert.deepEqual(item!.highlights, []);
  });
});
