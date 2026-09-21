import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  brandDisplayName,
  brandFaq,
  brandMetaDescription,
  brandPageTitle,
  brandProductPhrase,
  detectLine,
  formatUah,
  indexableBrandCategories,
  pluralProducts,
  summarizeBrand,
  type BrandProductRow,
} from "./brand-pages";

function row(over: Partial<BrandProductRow>): BrandProductRow {
  return {
    slug: "pulsar-x",
    nameUk: "Тепловізор Pulsar X",
    nameRu: "Тепловизор Pulsar X",
    price: 50000,
    brandSlug: "pulsar",
    brandName: "PULSAR",
    categorySlug: "teplovizori",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const rows: BrandProductRow[] = [
  row({ slug: "pulsar-axion-xg30", nameUk: "Тепловізор Pulsar Axion XG30", price: 85500 }),
  row({ slug: "pulsar-helion-xp50", nameUk: "Тепловізор Pulsar Helion XP50", price: 104000 }),
  row({ slug: "pulsar-axion-2", nameUk: "Тепловізор Pulsar Axion 2 XQ35", price: 60000, updatedAt: "2026-09-10T00:00:00.000Z" }),
  row({ slug: "pulsar-thermion-2", nameUk: "Тепловізійний приціл Pulsar Thermion 2 LRF", price: 150000, categorySlug: "pricili" }),
  row({ slug: "pulsar-kronshtein", nameUk: "Кронштейн Pulsar", price: 1500, categorySlug: "aksesuary" }),
  row({ slug: "agm-rattler", nameUk: "Приціл AGM Rattler", brandSlug: "agm", categorySlug: "pricili" }),
];

describe("summarizeBrand", () => {
  it("counts products and categories for one brand", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    assert.equal(s.total, 5);
    assert.deepEqual(s.byCategory[0], { slug: "teplovizori", count: 3 });
    assert.equal(s.lastModified, "2026-09-10T00:00:00.000Z");
  });

  it("ignores accessories in the price range when devices exist", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    assert.equal(s.minPrice?.price, 60000);
    assert.equal(s.maxPrice?.price, 150000);
  });

  it("uses accessory prices when the listing is only accessories", () => {
    const s = summarizeBrand(rows, "pulsar", "uk", "aksesuary");
    assert.equal(s.minPrice?.price, 1500);
  });

  it("detects model lines with their main category", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    assert.deepEqual(s.lines[0], { name: "Axion", count: 2, categorySlug: "teplovizori" });
    assert.ok(s.lines.some((l) => l.name === "Thermion" && l.categorySlug === "pricili"));
  });

  it("scopes to a category", () => {
    const s = summarizeBrand(rows, "pulsar", "uk", "pricili");
    assert.equal(s.total, 1);
    assert.equal(s.minPrice?.slug, "pulsar-thermion-2");
  });
});

describe("detectLine", () => {
  it("matches whole words only", () => {
    assert.equal(detectLine("infiray", { nameUk: "InfiRay Eye III E6+", slug: "x" }), "Eye");
    assert.equal(detectLine("infiray", { nameUk: "InfiRay Xeye E3", slug: "x" }), "Xeye");
  });

  it("matches hyphenated lines written with a space", () => {
    assert.equal(detectLine("atn", { nameUk: "ATN X Sight 5", slug: "x" }), "X-Sight");
  });

  it("returns null for brands without a line list", () => {
    assert.equal(detectLine("dali", { nameUk: "Dali S240", slug: "x" }), null);
  });
});

describe("titles and copy", () => {
  it("names the two biggest categories in the H1 and title", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    assert.equal(brandProductPhrase(s, "uk"), "Тепловізори та приціли");
    const { h1, title } = brandPageTitle("Pulsar", s, "uk");
    assert.equal(h1, "Тепловізори та приціли Pulsar");
    assert.equal(title, "Тепловізори та приціли Pulsar — купити в Україні, ціни");
  });

  it("uses the category's full name on brand × category pages", () => {
    const s = summarizeBrand(rows, "pulsar", "ru", "pricili");
    const { h1 } = brandPageTitle("Pulsar", s, "ru", { categorySlug: "pricili" });
    assert.equal(h1, "Тепловизионные прицелы Pulsar");
  });

  it("marks deeper pages in the title", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    assert.equal(
      brandPageTitle("Pulsar", s, "uk", { page: 3 }).title,
      "Тепловізори та приціли Pulsar — сторінка 3"
    );
  });

  it("keeps meta descriptions within 160 characters", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    const d = brandMetaDescription("Pulsar", s, "uk").replace(/\u00a0/g, " ");
    assert.ok(d.length <= 160, d);
    assert.match(d, /5 товарів/);
    assert.match(d, /від 60 000 грн/);
    assert.doesNotMatch(d, /наявност/);
  });

  it("builds FAQ answers from catalog numbers", () => {
    const s = summarizeBrand(rows, "pulsar", "uk");
    const faq = brandFaq("Pulsar", s, "uk").map((f) => ({
      q: f.q,
      a: f.a.replace(/\u00a0/g, " "),
    }));
    assert.match(faq[0].q, /Скільки коштують прилади Pulsar/);
    assert.match(faq[0].a, /від 60 000 грн до 150 000 грн/);
    assert.match(faq[1].a, /5 товарів Pulsar/);
    assert.doesNotMatch(faq.map((f) => f.a).join(" "), /в наявності \d/);
  });

  it("prefers readable brand names over DB caps", () => {
    assert.equal(brandDisplayName("pulsar", "PULSAR"), "Pulsar");
    assert.equal(brandDisplayName("atn", "ATN"), "ATN");
  });
});

describe("pluralProducts / formatUah", () => {
  it("declines uk and ru", () => {
    assert.equal(pluralProducts(1, "uk"), "1 товар");
    assert.equal(pluralProducts(3, "uk"), "3 товари");
    assert.equal(pluralProducts(11, "uk"), "11 товарів");
    assert.equal(pluralProducts(22, "ru"), "22 товара");
    assert.equal(pluralProducts(25, "ru"), "25 товаров");
  });

  it("groups thousands with no-break spaces", () => {
    assert.equal(formatUah(115000), "115\u00a0000\u00a0грн");
    assert.equal(formatUah(1500), "1\u00a0500\u00a0грн");
    assert.equal(formatUah(950), "950\u00a0грн");
  });
});

describe("indexableBrandCategories", () => {
  it("keeps only combos with enough products", () => {
    const combos = indexableBrandCategories(rows);
    assert.deepEqual(
      combos.map((c) => `${c.brandSlug}/${c.categorySlug}`),
      ["pulsar/teplovizori"]
    );
    assert.equal(combos[0].lastModified, "2026-09-10T00:00:00.000Z");
  });
});
