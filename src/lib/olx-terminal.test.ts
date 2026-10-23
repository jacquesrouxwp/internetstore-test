import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOlxUrl, parseDealPatch, parseMessages, pctOfNew, pickCatalogMatch, priceWindow, zone } from "./olx-terminal";

describe("olx terminal arithmetic", () => {
  it("takes 20% and 35% of the new price, rounded to 100", () => {
    assert.deepEqual(priceWindow(199999), { newPrice: 199999, target: 40000, ceiling: 70000 });
    assert.equal(priceWindow(0), null);
  });
  it("places prices in the zones", () => {
    assert.equal(zone(20000, 100000), "good");
    assert.equal(zone(30000, 100000), "owner");
    assert.equal(zone(40000, 100000), "out");
    assert.equal(pctOfNew(27000, 100000), "27%");
  });
});

describe("olx terminal input", () => {
  it("accepts only olx.ua listing links", () => {
    assert.equal(normalizeOlxUrl("https://www.olx.ua/d/uk/obyavlenie/pulsar-axion-IDabc.html?x=1"), "https://www.olx.ua/d/uk/obyavlenie/pulsar-axion-IDabc.html");
    assert.equal(normalizeOlxUrl("https://evil.example/olx.ua"), null);
  });
  it("keeps known fields and clean numbers", () => {
    assert.deepEqual(parseDealPatch({ asking_price: "40 000 грн", status: "needs_ok", hack: 1 }), { asking_price: 40000, status: "needs_ok" });
    assert.deepEqual(parseDealPatch({ status: "drop table" }), {});
  });
  it("reads chat lines from either side", () => {
    const m = parseMessages([{ from: "us", text: "за 19 700 віддасте?" }, { from: "x", text: "?" }]);
    assert.equal(m.length, 1);
    assert.equal(m[0].from, "us");
  });
});

describe("pickCatalogMatch", () => {
  const cat = [
    { slug: "le10s", name_uk: "Тепловізор HikMicro LYNX Pro LE10S" },
    { slug: "th35", name_uk: "Тепловізійний приціл HikMicro Thunder TH35" },
    { slug: "th35pc", name_uk: "Тепловізійна насадка HikMicro THUNDER TH35PC 2.0" },
  ];
  it("does not take a longer model for a shorter one", () => {
    assert.equal(pickCatalogMatch("HikMicro LYNX Pro LE10", cat), null);
    assert.equal(pickCatalogMatch("Thunder TH35C", cat), null);
  });
  it("takes the one whole match", () => {
    assert.equal(pickCatalogMatch("Thunder TH35", cat), "th35");
    assert.equal(pickCatalogMatch("LYNX Pro LE10S", cat), "le10s");
  });
});
