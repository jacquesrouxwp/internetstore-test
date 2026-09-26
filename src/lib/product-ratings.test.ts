import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import { specRatings } from "./product-ratings";

function product(over: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "p",
    sku: "P",
    nameUk: "Тепловізор",
    nameRu: "Тепловизор",
    descriptionUk: "",
    descriptionRu: "",
    shortUk: null,
    shortRu: null,
    price: 45000,
    oldPrice: null,
    stock: 1,
    brandId: "b",
    brandSlug: "hikmicro",
    brandName: "HikMicro",
    categoryId: "c",
    categorySlug: "teplovizori",
    deviceType: "mono",
    resolution: "384x288",
    detectionRangeM: 1300,
    rating: 0,
    reviewsCount: 0,
    images: [],
    specs: { "Вага, г": "380", "Автономність, год": "6.5" },
    published: true,
    createdAt: "2026-01-01",
    ...over,
  } as Product;
}

function starsOf(p: Product) {
  return Object.fromEntries(specRatings(p, "uk").map((r) => [r.key, r.stars]));
}

describe("spec ratings", () => {
  it("rates a mid-range monocular in the middle of every scale", () => {
    assert.deepEqual(starsOf(product()), {
      detail: 4, // 384x288 = 110 592 px
      range: 3, // 1300 m
      weight: 4, // 380 g
      battery: 3, // 6.5 h
      price: 4, // 45 000 UAH
    });
  });

  it("gives a 640 matrix more stars than a 256 one", () => {
    const big = starsOf(product({ resolution: "640x512" })).detail;
    const small = starsOf(product({ resolution: "256x192" })).detail;
    assert.equal(big, 5);
    assert.equal(small, 2);
    assert.ok(big > small);
  });

  it("rewards a lighter body and a cheaper price", () => {
    const light = starsOf(product({ specs: { "Вага, г": "290" } })).weight;
    const heavy = starsOf(product({ specs: { "Вага, г": "1100" } })).weight;
    assert.equal(light, 5);
    assert.equal(heavy, 1);
    assert.equal(starsOf(product({ price: 19000 })).price, 5);
    assert.equal(starsOf(product({ price: 320000 })).price, 1);
  });

  it("leaves out a criterion the spec sheet does not state", () => {
    const keys = specRatings(
      product({ detectionRangeM: null, specs: {} }),
      "uk",
    ).map((r) => r.key);
    assert.deepEqual(keys, ["detail", "price"]);
  });

  it("shows the number behind the stars, localized", () => {
    const uk = specRatings(product(), "uk");
    assert.equal(uk.find((r) => r.key === "range")?.value, "1300 м");
    assert.equal(uk.find((r) => r.key === "battery")?.value, "6,5 год");
    assert.equal(uk.find((r) => r.key === "detail")?.value, "384×288");
    const ru = specRatings(product(), "ru");
    assert.equal(ru.find((r) => r.key === "battery")?.value, "6,5 ч");
  });
});
