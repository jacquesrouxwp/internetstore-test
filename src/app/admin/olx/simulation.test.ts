import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIM_SECONDS, createDeals, step } from "./simulation";
import type { OlxModel } from "@/lib/olx-terminal";

const model: OlxModel = {
  id: "th35",
  name: "HikMicro Thunder TH35",
  aliases: [],
  category: null,
  target_price: 30000,
  ceiling_price: 38000,
  adjust: { used: 4000, no_box: 1500, no_docs: 2000 },
  notes: null,
};

describe("OLX terminal demo", () => {
  it("plays the buying rules out within 5 minutes when the owner does nothing", () => {
    const deals = createDeals([model], [{ condition: "used", has_box: false, has_docs: true, kit: "кабель" }]);
    for (let t = 0; t <= SIM_SECONDS; t += 0.25) step(deals, t);
    const count = (s: string) => deals.filter((d) => d.row.status === s).length;
    // 3 sellers come down to the target, 5 wait for an ок that never comes, 2 stay above the ceiling
    assert.equal(count("bought"), 3);
    assert.equal(count("lost"), 5);
    assert.equal(count("rejected"), 2);
    for (const d of deals) {
      // Priced for this item: used and without a box
      assert.equal(d.row.buy!.target, 30000 - 4000 - 1500);
      assert.equal(d.row.condition, "used");
    }
    for (const d of deals.filter((x) => x.row.status === "bought")) assert.ok(d.row.final_price! <= d.row.buy!.target);
  });

  it("never lets the bot buy a defective item by itself", () => {
    const deals = createDeals([model], [{ condition: "defect", has_box: true, has_docs: true, kit: "тріщина" }]);
    for (let t = 0; t <= SIM_SECONDS; t += 0.25) step(deals, t);
    assert.equal(deals.filter((d) => d.row.status === "bought").length, 0);
  });
});
