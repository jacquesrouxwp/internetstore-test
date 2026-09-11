import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizedPath, pageAlternates } from "./seo-alternates";

const BASE = "https://pro-optics.com.ua";

describe("localizedPath", () => {
  it("keeps uk unprefixed and puts ru under /ru", () => {
    assert.equal(localizedPath("uk", "/catalog/teplovizori"), "/catalog/teplovizori");
    assert.equal(localizedPath("ru", "/catalog/teplovizori"), "/ru/catalog/teplovizori");
  });

  it("maps the homepage to / and /ru (never /ru/)", () => {
    assert.equal(localizedPath("uk", "/"), "/");
    assert.equal(localizedPath("ru", "/"), "/ru");
    assert.equal(localizedPath("ru", ""), "/ru");
  });

  it("tolerates a path without a leading slash", () => {
    assert.equal(localizedPath("ru", "delivery"), "/ru/delivery");
  });
});

describe("pageAlternates", () => {
  it("canonical is the page itself — never the homepage", () => {
    // The regression this exists for: an inherited root canonical made every
    // category page point at the homepage.
    const a = pageAlternates("uk", "/catalog/teplovizori");
    assert.equal(a.canonical, `${BASE}/catalog/teplovizori`);
    assert.notEqual(a.canonical, BASE);
  });

  it("ru page is canonical to itself, not to its uk twin", () => {
    const a = pageAlternates("ru", "/delivery");
    assert.equal(a.canonical, `${BASE}/ru/delivery`);
  });

  it("emits uk-UA, ru-UA and x-default → uk", () => {
    const a = pageAlternates("ru", "/product/agm-rattler");
    assert.deepEqual(a.languages, {
      "uk-UA": `${BASE}/product/agm-rattler`,
      "ru-UA": `${BASE}/ru/product/agm-rattler`,
      "x-default": `${BASE}/product/agm-rattler`,
    });
  });

  it("both locales of a page advertise the same alternate set", () => {
    const uk = pageAlternates("uk", "/about");
    const ru = pageAlternates("ru", "/about");
    assert.deepEqual(uk.languages, ru.languages);
  });

  it("homepage alternates", () => {
    const a = pageAlternates("ru", "/");
    assert.equal(a.canonical, `${BASE}/ru`);
    assert.equal(a.languages["uk-UA"], BASE);
    assert.equal(a.languages["ru-UA"], `${BASE}/ru`);
  });
});
