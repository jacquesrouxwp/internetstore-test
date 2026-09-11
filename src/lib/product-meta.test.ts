import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { META_DESCRIPTION_MAX, productMetaDescription } from "./product-meta";

const NAME = "Тепловізійний приціл AGM RATTLER V2 35-384";
const P = { price: 45000, stock: 3, resolution: "384x288", detectionRangeM: 1800 };

function occurrences(hay: string, needle: string): number {
  return hay.split(needle).length - 1;
}

describe("productMetaDescription", () => {
  it("names the product exactly once (the old text repeated it)", () => {
    assert.equal(occurrences(productMetaDescription(P, NAME, "uk"), NAME), 1);
  });

  it("carries the shop brand in both Latin and Cyrillic", () => {
    const uk = productMetaDescription(P, NAME, "uk");
    assert.ok(uk.includes("Pro-Optics"));
    assert.ok(uk.includes("Про Оптікс"));
    const ru = productMetaDescription(P, NAME, "ru");
    assert.ok(ru.includes("Про Оптикс"));
  });

  it("includes specs and a space-grouped price", () => {
    const d = productMetaDescription(P, NAME, "uk");
    assert.ok(d.includes("384×288"), d);
    assert.ok(d.includes("1800 м"), d);
    assert.ok(d.includes("45 000 грн"), d);
  });

  it("uses Russian copy on the Russian page", () => {
    const d = productMetaDescription(P, NAME, "ru");
    assert.ok(d.includes("купить"));
    assert.ok(d.includes("Цена"));
    assert.ok(!d.includes("купити"));
  });

  it("stays within Google's snippet length", () => {
    for (const loc of ["uk", "ru"] as const) {
      const d = productMetaDescription(P, NAME, loc);
      assert.ok(d.length <= META_DESCRIPTION_MAX, `${loc}: ${d.length} chars`);
    }
  });

  it("drops trailing parts whole instead of cutting mid-sentence", () => {
    const long = "Дуже довга назва приладу ".repeat(4).trim();
    const d = productMetaDescription(P, long, "uk");
    assert.ok(d.endsWith("."), d);
    assert.ok(d.startsWith(long));
  });

  it("omits what it does not know", () => {
    const bare = productMetaDescription(
      { price: 0, stock: 0, resolution: null, detectionRangeM: null },
      NAME,
      "uk"
    );
    assert.ok(!bare.includes("Матриця"));
    assert.ok(!bare.includes("Ціна"));
    assert.ok(!bare.includes("В наявності"));
    assert.ok(bare.includes("Доставка"));
  });
});
