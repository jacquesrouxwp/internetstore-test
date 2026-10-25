import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyPrices, matchModel, normalizeOlxUrl, parseDealPatch, parseMessages, zone, type OlxModel } from "./olx-terminal";

const th35: OlxModel = {
  id: "th35",
  name: "HikMicro Thunder TH35",
  aliases: [],
  category: "тепловізори",
  target_price: 30000,
  ceiling_price: 38000,
  adjust: { new: 3000, used: 4000, no_box: 1500, no_docs: 2000 },
  notes: null,
};

describe("buying prices per model", () => {
  it("takes the model's prices for a full kit in like-new condition", () => {
    const b = buyPrices(th35, { condition: "like_new", has_box: true, has_docs: true })!;
    assert.equal(b.target, 30000);
    assert.equal(b.ceiling, 38000);
    assert.deepEqual(b.unknown, []);
  });
  it("moves both prices by condition, box and documents", () => {
    const b = buyPrices(th35, { condition: "used", has_box: false, has_docs: true })!;
    assert.equal(b.target, 30000 - 4000 - 1500);
    assert.equal(b.ceiling, 38000 - 4000 - 1500);
    assert.equal(buyPrices(th35, { condition: "new", has_box: true, has_docs: true })!.target, 33000);
  });
  it("prices what is not known yet as the worse case, and says what to ask", () => {
    const b = buyPrices(th35, { condition: null, has_box: null, has_docs: true })!;
    assert.equal(b.target, 30000 - 4000 - 1500);
    assert.deepEqual(b.unknown, ["стан", "коробка"]);
  });
  it("leaves a defect to the owner whatever the price", () => {
    const b = buyPrices(th35, { condition: "defect", has_box: true, has_docs: true })!;
    assert.equal(zone(1000, b), "owner");
  });
  it("places prices in the zones", () => {
    const b = buyPrices(th35, { condition: "like_new", has_box: true, has_docs: true });
    assert.equal(zone(30000, b), "good");
    assert.equal(zone(35000, b), "owner");
    assert.equal(zone(40000, b), "out");
    assert.equal(buyPrices({ ...th35, target_price: null }, { condition: null, has_box: null, has_docs: null }), null);
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
  it("reads condition, box and documents in words", () => {
    assert.deepEqual(parseDealPatch({ condition: "як нове", has_box: "так", has_docs: "немає" }), { condition: "like_new", has_box: true, has_docs: false });
    assert.equal(parseDealPatch({ condition: "б/у" }).condition, "used");
    assert.equal(parseDealPatch({ condition: "після ремонту" }).condition, "defect");
    assert.equal(parseDealPatch({ has_box: "?" }).has_box, null);
  });
  it("reads chat lines from either side", () => {
    const m = parseMessages([{ from: "us", text: "за 19 700 віддасте?" }, { from: "x", text: "?" }]);
    assert.equal(m.length, 1);
    assert.equal(m[0].from, "us");
  });
});

describe("matchModel", () => {
  const models = [
    { id: "le10s", name: "HikMicro LYNX Pro LE10S" },
    { id: "th35", name: "Thunder TH35", aliases: ["TH35 Thunder"] },
    { id: "tyke", name: "Tyke L325" },
    { id: "rh50", name: "RICO RH50" },
    { id: "rh50v2", name: "RICO RH50 V2" },
    { id: "e6v3", name: "XEYE 2 E6+ V3" },
  ];
  it("does not take one model for another", () => {
    assert.equal(matchModel("HikMicro LYNX Pro LE10", models), null);
    assert.equal(matchModel("Thunder TH35C", models), null);
  });
  it("ignores brand and type words and word order", () => {
    assert.equal(matchModel("Тепловізійний приціл HikMicro Thunder TH35", models)?.id, "th35");
    assert.equal(matchModel("InfiRay Tyke L325", models)?.id, "tyke");
    assert.equal(matchModel("InfiRay XEYE 2 E6 + V3", models)?.id, "e6v3");
    assert.equal(matchModel("RICO RH50", models)?.id, "rh50");
    assert.equal(matchModel("RICO RH50 V2", models)?.id, "rh50v2");
  });
});
