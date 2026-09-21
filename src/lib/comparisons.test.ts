import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPARISONS,
  comparisonHighlights,
  comparisonsFor,
  getComparison,
  productMetrics,
  sharedTraits,
} from "./comparisons";

const axion = productMetrics({
  price: 117000,
  resolution: "640x480",
  detectionRangeM: 1750,
  nameUk: "Тепловізор Pulsar Axion 2 XG35",
  specs: {
    "Об єктив, мм": "35",
    "Крок пікселю, мкм": "12",
    "Різниця температур матриці (NETD)": "40",
    "Вага, грам": "260",
    "Автономна робота, г": "8",
    "Лазерний далекомір": "Ні",
  },
});
const lynx = productMetrics({
  price: 74000,
  resolution: "640x512",
  detectionRangeM: 2000,
  nameUk: "Тепловізор HikMicro Lynx LQ35 3.0",
  specs: {
    "Об єктив, мм": "35",
    "Крок пікселю, мкм": "12",
    "Різниця температур матриці (NETD)": "15",
    "Вага, грам": "320",
    "Автономна робота, г": "8",
  },
});

describe("COMPARISONS", () => {
  it("has unique slugs and two different products per pair", () => {
    const slugs = COMPARISONS.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const c of COMPARISONS) assert.notEqual(c.a.slug, c.b.slug);
  });

  it("finds pairs by slug and by product", () => {
    assert.ok(getComparison(COMPARISONS[0].slug));
    assert.equal(getComparison("nope"), null);
    const adder = "agm-teploviziynyy-prytsil-agm-adder-v2-35-384-agm-adder-v2-35-384";
    assert.equal(comparisonsFor(adder).length, 2);
  });
});

describe("productMetrics", () => {
  it("reads passport numbers from card specs", () => {
    assert.equal(axion.netdMk, 40);
    assert.equal(axion.lensMm, 35);
    assert.equal(axion.weightG, 260);
    assert.equal(axion.batteryH, 8);
    assert.equal(axion.lrf, false);
  });

  it("falls back to LRF in the name when the spec is missing", () => {
    const m = productMetrics({ price: 1, resolution: null, detectionRangeM: null, nameUk: "Condor LRF CQ35L", specs: {} });
    assert.equal(m.lrf, true);
  });
});

describe("comparisonHighlights", () => {
  const h = comparisonHighlights(["Pulsar Axion 2 XG35", "HikMicro Lynx LQ35 3.0"], axion, lynx, "uk")
    .map((x) => ({ ...x, text: x.text.replace(/\u00a0/g, " ") }));

  it("states only differing metrics, with the difference", () => {
    const text = h.map((x) => x.text).join("\n");
    assert.match(text, /на 250 м більше/);
    assert.match(text, /NETD: Pulsar Axion 2 XG35 — 40 мК, HikMicro Lynx LQ35 3.0 — 15 мК/);
    assert.match(text, /дешевший на 43 000 грн/);
    assert.doesNotMatch(text, /акумулятора/); // both 8 h
  });

  it("marks which side the numbers favour", () => {
    const edges = Object.fromEntries(h.map((x) => [x.text.split(":")[0], x.edge]));
    assert.equal(edges["Дальність виявлення людини за паспортом"], "b");
    assert.equal(edges["Вага"], "a");
  });

  it("names what the pair shares", () => {
    assert.deepEqual(sharedTraits(axion, lynx, "uk"), ["матриця 640", "об'єктив 35 мм"]);
  });
});
