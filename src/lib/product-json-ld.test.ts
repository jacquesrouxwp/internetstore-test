import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import {
  buildProductJsonLd,
  productJsonLdDescription,
} from "./product-json-ld";

function baseProduct(over: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "hikmicro-lynx-lh19-3-0",
    sku: "HM-LH19",
    nameUk: "Тепловізор HikMicro LYNX LH19 3.0",
    nameRu: "Тепловизор HikMicro LYNX LH19 3.0",
    descriptionUk: null,
    descriptionRu: null,
    shortUk: "Компактний тепловізор",
    shortRu: "Компактный тепловизор",
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

describe("productJsonLdDescription", () => {
  it("never returns empty and pads short text", () => {
    const d = productJsonLdDescription(baseProduct(), "uk");
    assert.ok(d.length >= 50);
    assert.match(d, /HikMicro|LYNX|Поштою/i);
  });

  it("uses full description when long enough", () => {
    const long =
      "Повноцінний опис тепловізора HikMicro LYNX LH19 3.0 для полювання та охорони. Матриця 384×288, дальність до 900 м.";
    const d = productJsonLdDescription(
      baseProduct({ descriptionUk: long }),
      "uk"
    );
    assert.ok(d.includes("Повноцінний опис"));
  });
});

describe("buildProductJsonLd", () => {
  it("includes required Product + Offer fields", () => {
    const data = buildProductJsonLd({
      product: baseProduct(),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
      delivery: {
        defaultCost: 70,
        freeFrom: 5000,
        note: "Доставка Новою Поштою",
      },
    });

    assert.equal(data["@type"], "Product");
    assert.equal(data.name, "Тепловізор HikMicro LYNX LH19 3.0");
    assert.ok(String(data.description).length >= 50);
    assert.deepEqual(data.brand, { "@type": "Brand", name: "HikMicro" });
    assert.equal(data.sku, "HM-LH19");
    assert.equal(data.mpn, "HM-LH19");

    const img = data.image;
    assert.ok(
      typeof img === "string"
        ? img.startsWith("https://")
        : Array.isArray(img) && String(img[0]).startsWith("https://")
    );

    const offers = data.offers as Record<string, unknown>;
    assert.equal(offers["@type"], "Offer");
    assert.equal(offers.priceCurrency, "UAH");
    assert.equal(offers.price, 45000);
    assert.equal(offers.availability, "https://schema.org/InStock");
    assert.ok(offers.hasMerchantReturnPolicy);
    assert.ok(offers.shippingDetails);

    const ship = offers.shippingDetails as Record<string, unknown>;
    assert.equal(ship["@type"], "OfferShippingDetails");
    assert.match(String(ship.shippingLabel), /Пошт/i);
    const rate = ship.shippingRate as Record<string, unknown>;
    assert.equal(rate.currency, "UAH");
    // freeFrom 5000, price 45000 → free shipping
    assert.equal(rate.value, "0");

    const paid = buildProductJsonLd({
      product: baseProduct({ price: 3000 }),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
      delivery: {
        defaultCost: 70,
        freeFrom: 5000,
        note: "Доставка Новою Поштою",
      },
    });
    const paidRate = (
      (paid.offers as Record<string, unknown>).shippingDetails as Record<
        string,
        unknown
      >
    ).shippingRate as Record<string, unknown>;
    assert.equal(paidRate.value, "70");

    // No fake aggregateRating without realReviews
    assert.equal(data.aggregateRating, undefined);
  });

  it("sets OutOfStock when stock is 0", () => {
    const data = buildProductJsonLd({
      product: baseProduct({ stock: 0 }),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
    });
    const offers = data.offers as Record<string, unknown>;
    assert.equal(offers.availability, "https://schema.org/OutOfStock");
  });

  it("always provides brand even if brandName missing", () => {
    const data = buildProductJsonLd({
      product: baseProduct({ brandName: null, brandSlug: null }),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
    });
    assert.deepEqual(data.brand, { "@type": "Brand", name: "Pro-Optics" });
  });

  it("adds gtin13 from specs when present", () => {
    const data = buildProductJsonLd({
      product: baseProduct({
        specs: { EAN: "5901234123457", Матриця: "384x288" },
      }),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
    });
    assert.equal(data.gtin13, "5901234123457");
  });

  it("includes aggregateRating only when realReviews passed", () => {
    const without = buildProductJsonLd({
      product: baseProduct({ reviewsCount: 99, rating: 5 }),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
    });
    assert.equal(without.aggregateRating, undefined);

    const withReal = buildProductJsonLd({
      product: baseProduct(),
      locale: "uk",
      siteUrl: "https://pro-optics.com.ua",
      realReviews: { ratingValue: 4.5, reviewCount: 3 },
    });
    assert.deepEqual(withReal.aggregateRating, {
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 3,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("return policy is UA 14 days", () => {
    const data = buildProductJsonLd({
      product: baseProduct(),
      locale: "ru",
      siteUrl: "https://pro-optics.com.ua",
    });
    const offers = data.offers as Record<string, unknown>;
    const ret = offers.hasMerchantReturnPolicy as Record<string, unknown>;
    assert.equal(ret.applicableCountry, "UA");
    assert.equal(ret.merchantReturnDays, 14);
  });
});
