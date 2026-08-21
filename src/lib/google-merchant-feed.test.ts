import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import {
  productToMerchantFields,
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
