import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PREMIUM_BRANDS,
  PREMIUM_CATEGORIES,
  brandsFor,
  formatPremiumOrderTelegramHtml,
  validatePremiumOrder,
} from "./premium-order";

const GOOD = {
  category: "binoculars",
  brand: "Swarovski Optik",
  model: "NL Pure 10x42",
  budget: "150 000",
  comment: "Для спостереження на світанку",
  name: "Олена",
  phone: "063 789 76 99",
  contactVia: "Telegram",
  locale: "uk",
};

describe("premium order validation", () => {
  it("accepts a complete request and normalises the phone and budget", () => {
    const r = validatePremiumOrder(GOOD);
    assert.ok(r.ok, JSON.stringify(r.errors));
    assert.equal(r.value!.phone, "+380637897699");
    assert.equal(r.value!.budget, 150000);
    assert.equal(r.value!.category, "binoculars");
  });

  it("needs a category, a model, a name and a working phone", () => {
    const r = validatePremiumOrder({ locale: "uk" });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ["category", "model", "name", "phone"]);
  });

  it("refuses a category it does not know", () => {
    assert.equal(validatePremiumOrder({ ...GOOD, category: "rifles" }).ok, false);
  });

  it("leaves the brand and the budget optional", () => {
    const r = validatePremiumOrder({ ...GOOD, brand: "", budget: "" });
    assert.ok(r.ok);
    assert.equal(r.value!.brand, null);
    assert.equal(r.value!.budget, null);
  });

  it("answers in the language of the page", () => {
    const r = validatePremiumOrder({ locale: "ru" });
    assert.match(r.errors.phone, /Укажите/);
    const e = validatePremiumOrder({ locale: "en" });
    assert.match(e.errors.model, /model/);
  });

  it("refuses a budget that is not a number", () => {
    assert.equal(validatePremiumOrder({ ...GOOD, budget: "0" }).ok, false);
  });
});

describe("premium order message", () => {
  it("escapes what the buyer typed", () => {
    const r = validatePremiumOrder({ ...GOOD, model: "<b>EL</b> & co", comment: "<script>x</script>" });
    const html = formatPremiumOrderTelegramHtml(r.value!);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;b&gt;EL&lt;\/b&gt; &amp; co/);
    assert.match(html, /tel:\+380637897699/);
  });

  it("says when the budget was not given", () => {
    const r = validatePremiumOrder({ ...GOOD, budget: "" });
    assert.match(formatPremiumOrderTelegramHtml(r.value!), /Бюджет не вказав/);
  });
});

describe("premium brand list", () => {
  it("gives every category in the page sections at least one brand", () => {
    for (const c of PREMIUM_CATEGORIES.filter((x) => x !== "other")) {
      assert.ok(brandsFor(c).length > 0, c);
    }
  });

  it("names every brand once, with all three languages filled", () => {
    const names = PREMIUM_BRANDS.map((b) => b.name);
    assert.equal(new Set(names).size, names.length);
    for (const b of PREMIUM_BRANDS) {
      for (const l of ["uk", "ru", "en"] as const) {
        assert.ok(b.country[l] && b.lines[l], `${b.name} ${l}`);
      }
    }
  });
});
