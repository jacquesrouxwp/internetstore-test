import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRAND_GROUPS,
  PREMIUM_BRANDS,
  allPremiumModels,
  formatPremiumOrderTelegramHtml,
  validatePremiumOrder,
} from "./premium-order";

const GOOD = {
  model: "Swarovski NL Pure 10x42",
  name: "Олена",
  phone: "063 789 76 99",
  locale: "uk",
};

describe("premium order validation", () => {
  it("accepts a model, a name and a phone, and normalises the phone", () => {
    const r = validatePremiumOrder(GOOD);
    assert.ok(r.ok, JSON.stringify(r.errors));
    assert.equal(r.value!.phone, "+380637897699");
    assert.equal(r.value!.model, "Swarovski NL Pure 10x42");
  });

  it("needs all three", () => {
    const r = validatePremiumOrder({ locale: "uk" });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ["model", "name", "phone"]);
  });

  it("asks for nothing else — no price, no budget, no category", () => {
    const r = validatePremiumOrder({ ...GOOD, budget: "abc", category: "rifles", askingPrice: -1 });
    assert.ok(r.ok);
    assert.deepEqual(Object.keys(r.value!).sort(), ["createdAt", "locale", "model", "name", "phone"]);
  });

  it("answers in the language of the page", () => {
    assert.match(validatePremiumOrder({ locale: "ru" }).errors.phone, /Укажите/);
    assert.match(validatePremiumOrder({ locale: "en" }).errors.model, /model/);
  });
});

describe("premium order message", () => {
  it("escapes what the buyer typed", () => {
    const r = validatePremiumOrder({ ...GOOD, model: "<b>EL</b> & co", name: "<script>x</script>" });
    const html = formatPremiumOrderTelegramHtml(r.value!);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;b&gt;EL&lt;\/b&gt; &amp; co/);
    assert.match(html, /tel:\+380637897699/);
  });
});

describe("premium brand list", () => {
  it("names every brand once, with all three languages filled", () => {
    const names = PREMIUM_BRANDS.map((b) => b.name);
    assert.equal(new Set(names).size, names.length);
    for (const b of PREMIUM_BRANDS) {
      for (const l of ["uk", "ru", "en"] as const) {
        assert.ok(b.country[l] && b.lines[l], `${b.name} ${l}`);
      }
    }
  });

  it("puts every brand on a shelf, and the lesser-known European makers on their own", () => {
    for (const b of PREMIUM_BRANDS) assert.ok(BRAND_GROUPS.includes(b.group), b.name);
    const europe = PREMIUM_BRANDS.filter((b) => b.group === "europe").map((b) => b.short);
    for (const s of ["Liemke", "NOBLEX", "Eschenbach", "DDoptics", "Vectronix", "Hawke", "Viking"]) {
      assert.ok(europe.includes(s), s);
    }
  });

  it("keeps Docter as one card with NOBLEX, which owns the name", () => {
    assert.equal(PREMIUM_BRANDS.filter((b) => /Docter/.test(b.name)).length, 1);
    assert.equal(PREMIUM_BRANDS.find((b) => b.short === "Docter"), undefined);
  });

  it("lists every model once", () => {
    const models = allPremiumModels();
    assert.equal(new Set(models).size, models.length);
    assert.ok(models.length > 80, `only ${models.length} models`);
  });
});
