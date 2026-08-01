import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transliterate } from "./translit";
import { slugify } from "./utils";

describe("transliterate", () => {
  it("converts Ukrainian letters to Latin", () => {
    assert.equal(transliterate("Тепловізор"), "teplovizor");
    assert.equal(transliterate("Приціл"), "prytsil");
    assert.equal(transliterate("Кріплення"), "kriplennia");
  });

  it("handles Russian-only letters", () => {
    assert.equal(transliterate("Ёжик"), "ezhyk");
    assert.equal(transliterate("Съезд"), "sezd");
  });

  it("leaves Latin and digits untouched", () => {
    assert.equal(transliterate("HikMicro LYNX LE10 3.0"), "hikmicro lynx le10 3.0");
  });
});

describe("slugify", () => {
  // Regression: imported products got Cyrillic slugs, and every one of their
  // product pages 404'd (both raw and percent-encoded URLs) until slugs were
  // forced to ASCII.
  it("never emits non-ASCII characters", () => {
    const slug = slugify("Тепловізор AGM Seeker 25-384");
    assert.equal(slug, "teplovizor-agm-seeker-25-384");
    assert.match(slug, /^[a-z0-9-]+$/);
  });

  it("produces ASCII for a full brand+name+sku slug", () => {
    const slug = slugify("agm-Тепловізор AGM Seeker 25-384-AA-0013467");
    assert.match(slug, /^[a-z0-9-]+$/);
    assert.ok(slug.startsWith("agm-teplovizor-agm-seeker"));
  });

  it("collapses separators and trims edges", () => {
    assert.equal(slugify("  Привіт --- Світ!!  "), "pryvit-svit");
  });

  it("keeps already-ASCII slugs stable", () => {
    assert.equal(slugify("rix-pocket-k2"), "rix-pocket-k2");
    assert.equal(slugify("HikMicro LYNX LE10 3.0"), "hikmicro-lynx-le10-3-0");
  });
});
