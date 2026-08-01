import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  donorRootFromPath,
  mapDonorCategory,
  matchBrand,
  matchBrandFromName,
} from "./optics-pro-categories";
import type { Brand } from "@/types";

const OUR_BRANDS: Brand[] = [
  { id: "b1", slug: "hikmicro", name: "HikMicro" },
  { id: "b3", slug: "pulsar", name: "PULSAR" },
  { id: "b5", slug: "infiray", name: "INFIRAY" },
  { id: "b6", slug: "atn", name: "ATN" },
  { id: "b15", slug: "conotech", name: "Cono Tech" },
];

describe("donorRootFromPath / mapDonorCategory", () => {
  it("maps whitelisted donor roots to our category slugs", () => {
    assert.equal(
      donorRootFromPath(
        "ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-le10-3-0"
      ),
      "teplovizori"
    );
    assert.equal(mapDonorCategory("ua/teplovizori/x/y")?.ourSlug, "teplovizori");
    assert.equal(
      mapDonorCategory("ua/teplovizionnie_priceli/x")?.ourSlug,
      "pricili"
    );
    assert.equal(
      mapDonorCategory("ua/monokulyari_nochnogo_videniya/x")?.ourSlug,
      "pnb"
    );
    assert.equal(
      mapDonorCategory("ua/aksessuari_k_pnv/kronshtejny/x")?.ourSlug,
      "aksesuary"
    );
  });

  it("returns null for out-of-scope donor categories", () => {
    assert.equal(mapDonorCategory("ua/kollimatornie_priceli/x"), null);
    assert.equal(mapDonorCategory("ua/kvadrokopteri/x"), null);
    assert.equal(mapDonorCategory("ua/starlink-optics-pro/x"), null);
  });
});

describe("matchBrand", () => {
  it("matches exact and case-insensitive names/slugs", () => {
    assert.equal(matchBrand("HikMicro", OUR_BRANDS)?.slug, "hikmicro");
    assert.equal(matchBrand("PULSAR", OUR_BRANDS)?.slug, "pulsar");
  });

  it("resolves known donor aliases", () => {
    assert.equal(matchBrand("IRAY", OUR_BRANDS)?.slug, "infiray");
    assert.equal(matchBrand("INFIRAY (IRAY)", OUR_BRANDS)?.slug, "infiray");
  });

  it("returns null for brands outside the whitelist -- never guesses", () => {
    assert.equal(matchBrand("Senopex", OUR_BRANDS), null);
    assert.equal(matchBrand("Yukon", OUR_BRANDS), null);
    assert.equal(matchBrand(null, OUR_BRANDS), null);
    assert.equal(matchBrand("", OUR_BRANDS), null);
  });
});

describe("matchBrandFromName", () => {
  // Confirmed live (2026-08-01): optics-pro.com.ua omits the structured
  // `brand` field for some Cono Tech listings even though the title says so.
  it("finds a whitelisted brand mentioned in the product title", () => {
    assert.equal(
      matchBrandFromName("Тепловізор Cono-Tech Aquila 325", OUR_BRANDS)?.slug,
      "conotech"
    );
    assert.equal(
      matchBrandFromName("Тепловізор HikMicro LYNX LE10 3.0", OUR_BRANDS)?.slug,
      "hikmicro"
    );
  });

  it("does not match a brand that isn't actually mentioned", () => {
    assert.equal(matchBrandFromName("Тепловізор Дельта 350", OUR_BRANDS), null);
  });
});
