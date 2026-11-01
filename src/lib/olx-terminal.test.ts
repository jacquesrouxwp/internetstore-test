import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyPrices, matchModel, normalizeOlxUrl, parseDealPatch, parseMessages, sellerLine, zone, type OlxModel } from "./olx-terminal";

const th35: OlxModel = {
  id: "th35",
  name: "HikMicro Thunder TH35",
  product_slug: "th35",
  brand: "HikMicro",
  category: "Тепловізійні приціли",
  aliases: [],
  notes: null,
  tiers: {
    new_full: { from: 34000, to: 40000, needs_ok: false },
    new_bare: { from: 30000, to: 35000, needs_ok: false },
    g8: { from: 22000, to: 27000, needs_ok: true },
  },
};
const state = (grade: number | null, has_box: boolean | null = true, has_docs: boolean | null = true) => ({ condition: null, grade, has_box, has_docs });

describe("buying prices by state", () => {
  it("takes the range of the item's state", () => {
    const b = buyPrices(th35, state(10))!;
    assert.equal(b.tier, "new_full");
    assert.equal(b.from, 34000);
    assert.equal(b.to, 40000);
    assert.equal(zone(38000, b), "good");
    assert.equal(zone(41000, b), "out");
  });
  it("prices new without box or documents by its own range", () => {
    assert.equal(buyPrices(th35, state(10, false, true))!.tier, "new_bare");
    // Not known yet: priced as without, and the bot has to ask
    const b = buyPrices(th35, state(10, null, true))!;
    assert.equal(b.tier, "new_bare");
    assert.deepEqual(b.unknown, ["коробка"]);
    assert.equal(zone(30000, b), "owner");
  });
  it("needs the owner's ок when the state is ticked", () => {
    const b = buyPrices(th35, state(8))!;
    assert.equal(b.needs_ok, true);
    assert.equal(zone(23000, b), "owner");
  });
  it("leaves unpriced states, unknown grades and defects to the owner", () => {
    const g7 = buyPrices(th35, state(7))!;
    assert.equal(g7.to, null);
    assert.equal(g7.owner_only, true);
    assert.equal(buyPrices(th35, state(null))!.tier, null);
    assert.equal(buyPrices(th35, { ...state(10), condition: "defect" })!.owner_only, true);
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
  it("reads the grade out of 10", () => {
    assert.equal(parseDealPatch({ grade: "8/10" }).grade, 8);
    assert.equal(parseDealPatch({ grade: 11 }).grade, null);
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
    { id: "tyke", name: "Тепловізійний приціл INFIRAY (IRAY) Tyke L325" },
    { id: "th35cat", name: "Тепловізійний приціл HikMicro Thunder TH35C (HM-TR13-35XF/W-TH35C)" },
    { id: "rh50", name: "RICO RH50" },
    { id: "rh50v2", name: "RICO RH50 V2" },
    { id: "e6v3", name: "XEYE 2 E6+ V3" },
  ];
  it("does not take one model for another", () => {
    assert.equal(matchModel("HikMicro LYNX Pro LE10", models), null);
    assert.equal(matchModel("Thunder TH35C", models)?.id, "th35cat");
  });
  it("ignores brand and type words and word order", () => {
    assert.equal(matchModel("Тепловізійний приціл HikMicro Thunder TH35", models)?.id, "th35");
    assert.equal(matchModel("InfiRay Tyke L325", models)?.id, "tyke");
    assert.equal(matchModel("InfiRay XEYE 2 E6 + V3", models)?.id, "e6v3");
    assert.equal(matchModel("RICO RH50", models)?.id, "rh50");
    assert.equal(matchModel("RICO RH50 V2", models)?.id, "rh50v2");
  });
});

describe("seller on the deal", () => {
  it("keeps seller_id, contacted_count and seller_label from the bot", () => {
    const p = parseDealPatch({ seller_id: 12345, seller_name: "Сергій", contacted_count: "2", seller_label: " Сергій · писали 2 рази " });
    assert.equal(p.seller_id, "12345");
    assert.equal(p.seller_name, "Сергій");
    assert.equal(p.contacted_count, 2);
    assert.equal(p.seller_label, "Сергій · писали 2 рази");
  });
  it("does not wipe them when an update leaves them out or empty", () => {
    const p = parseDealPatch({ asking_price: 20000, seller_id: "", seller_label: null, contacted_count: "багато" });
    assert.ok(!("seller_id" in p));
    assert.ok(!("seller_label" in p));
    assert.ok(!("contacted_count" in p));
    assert.equal(p.contacted_count, undefined);
    assert.ok(!("contacted_count" in parseDealPatch({ contacted_count: -1 })));
    assert.equal(parseDealPatch({ contacted_count: 0 }).contacted_count, 0);
  });
  it("shows the label, else the name, else nothing", () => {
    assert.equal(sellerLine({ seller_label: "Сергій · новий продавець", seller_name: "Сергій" }), "Продавець: Сергій · новий продавець");
    assert.equal(sellerLine({ seller_label: "  ", seller_name: "Сергій" }), "Продавець: Сергій");
    assert.equal(sellerLine({ seller_label: null, seller_name: null }), null);
  });
});
