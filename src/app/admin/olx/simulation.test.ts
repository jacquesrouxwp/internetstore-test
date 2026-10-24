import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIM_SECONDS, createDeals, step } from "./simulation";

describe("OLX terminal demo", () => {
  it("plays the buying rules out within 5 minutes when the owner does nothing", () => {
    const deals = createDeals([{ slug: "a", name: "HikMicro Thunder TH35", n: 80000 }]);
    for (let t = 0; t <= SIM_SECONDS; t += 0.25) step(deals, t);
    const count = (s: string) => deals.filter((d) => d.row.status === s).length;
    // 3 sellers take 20 %, 5 wait for an ок that never comes, 2 ask over 35 %
    assert.equal(count("bought"), 3);
    assert.equal(count("lost"), 5);
    assert.equal(count("rejected"), 2);
    for (const d of deals.filter((x) => x.row.status === "bought")) assert.equal(d.row.final_price, 16000);
  });
});
