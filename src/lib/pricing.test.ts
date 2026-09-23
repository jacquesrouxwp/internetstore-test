import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayOldPrice, salePercent, MAX_CREDIBLE_DISCOUNT } from "@/types";

describe("displayOldPrice", () => {
  it("hides anchors deeper than the credible discount", () => {
    // Leonardo DRS IWS: 248 000 vs 817 990 грн → -70%
    assert.equal(displayOldPrice(248000, 817990), null);
    assert.equal(salePercent(248000, 817990), null);
  });

  it("keeps normal discounts", () => {
    assert.equal(displayOldPrice(88000, 100000), 100000);
    assert.equal(salePercent(88000, 100000), 12);
    assert.equal(salePercent(40000, 100000), MAX_CREDIBLE_DISCOUNT);
  });

  it("ignores missing or non-discount old prices", () => {
    assert.equal(displayOldPrice(1000, null), null);
    assert.equal(displayOldPrice(1000, 900), null);
    assert.equal(displayOldPrice(1000, 1000), null);
  });
});
