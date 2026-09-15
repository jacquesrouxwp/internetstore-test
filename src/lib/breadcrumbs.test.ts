import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { breadcrumbJsonLd, jsonLdScript } from "./breadcrumbs";

const BASE = "https://pro-optics.com.ua";

const TRAIL = [
  { name: "Головна", path: "/" },
  { name: "ПНБ / нічне бачення", path: "/catalog/pnb" },
  { name: "AGM PVS-14 NW1", path: "/product/agm-pvs-14" },
];

describe("breadcrumbJsonLd", () => {
  it("is a BreadcrumbList with 1-based positions in order", () => {
    const d = breadcrumbJsonLd("uk", TRAIL);
    assert.equal(d["@type"], "BreadcrumbList");
    assert.deepEqual(
      d.itemListElement.map((i) => i.position),
      [1, 2, 3]
    );
    assert.equal(d.itemListElement[1].name, "ПНБ / нічне бачення");
  });

  it("uses absolute URLs, unprefixed for uk", () => {
    const d = breadcrumbJsonLd("uk", TRAIL);
    assert.deepEqual(
      d.itemListElement.map((i) => i.item),
      [BASE, `${BASE}/catalog/pnb`, `${BASE}/product/agm-pvs-14`]
    );
  });

  it("prefixes every step with /ru on the Russian page", () => {
    const d = breadcrumbJsonLd("ru", TRAIL);
    assert.deepEqual(
      d.itemListElement.map((i) => i.item),
      [`${BASE}/ru`, `${BASE}/ru/catalog/pnb`, `${BASE}/ru/product/agm-pvs-14`]
    );
  });
});

describe("jsonLdScript", () => {
  it("cannot close the surrounding script tag", () => {
    const out = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    assert.ok(!out.includes("</script>"));
    assert.deepEqual(JSON.parse(out), {
      name: "</script><script>alert(1)</script>",
    });
  });
});
