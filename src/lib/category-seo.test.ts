import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categorySeo } from "./category-seo";

describe("categorySeo", () => {
  it("has uk and ru copy for the main categories", () => {
    for (const slug of ["teplovizori", "pricili", "pnb", "nasadky"]) {
      for (const loc of ["uk", "ru"] as const) {
        const e = categorySeo(slug, loc);
        assert.ok(e, `${slug}/${loc}`);
        assert.ok(e.title.length > 10);
        assert.match(e.html, /063 789-76-99/);
      }
    }
  });

  it("returns null for categories without copy", () => {
    assert.equal(categorySeo("aksesuary", "uk"), null);
  });

  it("keeps uk links as-is and prefixes ru links once", () => {
    assert.match(categorySeo("teplovizori", "uk")!.html, /href="\/catalog\/pricili"/);
    const ru = categorySeo("teplovizori", "ru")!.html;
    assert.match(ru, /href="\/ru\/catalog\/pricili"/);
    assert.match(ru, /href="\/ru\/viyskovym"/);
    assert.doesNotMatch(ru, /href="\/(?!ru\/)/);
    assert.doesNotMatch(ru, /\/ru\/ru\//);
  });
});

describe("categorySeo brand links", () => {
  it("links brand names in the intro to their pages", () => {
    const uk = categorySeo("teplovizori", "uk")!.html;
    assert.match(uk, /<a href="\/brand\/pulsar">Pulsar<\/a>/);
    assert.match(uk, /<a href="\/brand\/agm">AGM<\/a>/);
    const ru = categorySeo("pricili", "ru")!.html;
    assert.match(ru, /<a href="\/ru\/brand\/atn">ATN<\/a>/);
  });
});
