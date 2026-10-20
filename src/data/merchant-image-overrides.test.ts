import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { feedImageOrder } from "./merchant-image-overrides";

const imgs = ["a0", "a1", "a2", "a3"];

describe("feedImageOrder", () => {
  it("leaves products without an override as they are", () => {
    assert.deepEqual(feedImageOrder("unknown", imgs), imgs);
  });

  it("drops the badge photo so the next clean one becomes the main image", () => {
    assert.deepEqual(feedImageOrder("77479", imgs), ["a1", "a2", "a3"]);
  });

  it("puts the chosen clean photo first", () => {
    assert.deepEqual(feedImageOrder("TA62-35", imgs.slice(0, 3)), ["a2", "a1"]);
  });

  it("drops several photos", () => {
    assert.deepEqual(feedImageOrder("TPC-M40-B13-G", imgs), ["a2", "a3"]);
  });
});
