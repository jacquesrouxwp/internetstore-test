import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIM_SECONDS, createDeals, step } from "./simulation";
import type { OlxModel } from "@/lib/olx-terminal";

const model = (needs_ok: boolean): OlxModel => ({
  id: "th35",
  name: "HikMicro Thunder TH35",
  product_slug: null,
  brand: null,
  category: null,
  aliases: [],
  notes: null,
  tiers: { g8: { from: 20000, to: 25000, needs_ok } },
});
const used8 = [{ grade: 8, has_box: true, has_docs: false, kit: "кабель" }];

const run = (m: OlxModel, items = used8) => {
  const deals = createDeals([m], items);
  for (let t = 0; t <= SIM_SECONDS; t += 0.25) step(deals, t);
  return { deals, count: (s: string) => deals.filter((d) => d.row.status === s).length };
};

describe("OLX terminal demo", () => {
  it("buys by itself within the range when «наш ОК» is not ticked", () => {
    const { deals, count } = run(model(false));
    // 3 sellers go under our "від", 5 stop inside the range, 2 stay above our "до"
    assert.equal(count("bought"), 8);
    assert.equal(count("rejected"), 2);
    for (const d of deals.filter((x) => x.row.status === "bought")) {
      assert.ok(d.row.final_price! <= 25000);
      assert.ok(d.row.chat.some((m) => m.text.includes("Відправляйте на")));
    }
  });

  it("waits for the owner within the range when «наш ОК» is ticked", () => {
    const { count } = run(model(true));
    assert.equal(count("bought"), 0);
    assert.equal(count("lost"), 8); // nobody pressed Ок in the demo
    assert.equal(count("rejected"), 2);
  });

  it("never lets the bot buy a defective item by itself", () => {
    const { count } = run(model(false), [{ grade: 8, has_box: true, has_docs: true, kit: "тріщина", defect: true }] as never);
    assert.equal(count("bought"), 0);
  });
});
