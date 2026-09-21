import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BrandProductRow } from "./brand-pages";
import {
  COLLECTIONS,
  collectionDescription,
  collectionForFacet,
  collectionTitle,
  collectionsFor,
  getCollection,
  matchesCollection,
  summarizeCollection,
} from "./collections";

function row(over: Partial<BrandProductRow>): BrandProductRow {
  return {
    slug: "x",
    nameUk: "Тепловізор X",
    nameRu: "Тепловизор X",
    price: 40000,
    resolution: "384x288",
    brandSlug: "pulsar",
    brandName: "PULSAR",
    categorySlug: "teplovizori",
    ...over,
  };
}

const c640 = getCollection("teplovizori", "matrytsia-640")!;
const lrf = getCollection("pricili", "z-dalekomirom")!;
const cheap = getCollection("teplovizori", "do-30000")!;

describe("COLLECTIONS", () => {
  it("has unique category/slug pairs and copy in both languages", () => {
    const keys = COLLECTIONS.map((c) => `${c.category}/${c.slug}`);
    assert.equal(new Set(keys).size, keys.length);
    for (const c of COLLECTIONS) {
      for (const loc of ["uk", "ru"] as const) {
        assert.ok(c.h1[loc] && c.chip[loc] && c.intro[loc].length > 40, `${c.slug}/${loc}`);
      }
    }
  });

  it("lists a category's collections", () => {
    assert.ok(collectionsFor("teplovizori").length >= 4);
    assert.equal(collectionsFor("aksesuary").length, 0);
  });
});

describe("matchesCollection", () => {
  it("matches the resolution prefix like the catalog filter", () => {
    assert.ok(matchesCollection(row({ resolution: "640x512" }), c640));
    assert.ok(matchesCollection(row({ resolution: "640x480" }), c640));
    assert.ok(!matchesCollection(row({ resolution: "384x288" }), c640));
    assert.ok(!matchesCollection(row({ resolution: null }), c640));
  });

  it("stays inside the category", () => {
    assert.ok(!matchesCollection(row({ resolution: "640x512", categorySlug: "pricili" }), c640));
  });

  it("matches LRF in the name or slug, case-insensitive", () => {
    const p = { categorySlug: "pricili" };
    assert.ok(matchesCollection(row({ ...p, nameUk: "Приціл AGM Adder V2 LRF 35-384" }), lrf));
    assert.ok(matchesCollection(row({ ...p, slug: "pulsar-thermion-2-lrf-xp50" }), lrf));
    assert.ok(!matchesCollection(row({ ...p, nameUk: "Приціл AGM Adder V2 35-384" }), lrf));
  });

  it("applies the price ceiling inclusively", () => {
    assert.ok(matchesCollection(row({ price: 30000 }), cheap));
    assert.ok(!matchesCollection(row({ price: 30001 }), cheap));
  });
});

describe("summary and copy", () => {
  const rows = [
    row({ slug: "a", resolution: "640x512", price: 90000, brandSlug: "pulsar", brandName: "PULSAR" }),
    row({ slug: "b", resolution: "640x480", price: 120000, brandSlug: "hikmicro", brandName: "HikMicro" }),
    row({ slug: "c", resolution: "640x512", price: 150000, brandSlug: "pulsar", brandName: "PULSAR" }),
    row({ slug: "d", resolution: "384x288", price: 50000 }),
  ];

  it("counts products, prices and brands in the collection", () => {
    const s = summarizeCollection(rows, c640, "uk", (slug, name) => (slug === "pulsar" ? "Pulsar" : name));
    assert.equal(s.total, 3);
    assert.equal(s.minPrice?.price, 90000);
    assert.deepEqual(s.brands[0], { slug: "pulsar", name: "Pulsar", count: 2 });
  });

  it("builds a title and a ≤160-char description", () => {
    assert.equal(
      collectionTitle(c640, "uk"),
      "Тепловізори з матрицею 640 — купити в Україні, ціни"
    );
    assert.equal(collectionTitle(c640, "ru", 2), "Тепловизоры с матрицей 640 — страница 2");
    const d = collectionDescription(c640, summarizeCollection(rows, c640, "uk"), "uk");
    assert.ok(d.length <= 160, d);
    assert.match(d, /3 товари/);
  });
});

describe("collectionForFacet", () => {
  it("maps a lone res / max filter to its collection", () => {
    assert.equal(collectionForFacet("teplovizori", { res: "640" })?.slug, "matrytsia-640");
    assert.equal(collectionForFacet("teplovizori", { res: "384", page: "2" })?.slug, "matrytsia-384");
    assert.equal(collectionForFacet("teplovizori", { max: "30000" })?.slug, "do-30000");
  });

  it("ignores combined or unknown filters", () => {
    assert.equal(collectionForFacet("teplovizori", { res: "640", brand: "pulsar" }), null);
    assert.equal(collectionForFacet("teplovizori", { res: ["640", "384"] }), null);
    assert.equal(collectionForFacet("teplovizori", { max: "31000" }), null);
    assert.equal(collectionForFacet("aksesuary", { res: "640" }), null);
  });
});
