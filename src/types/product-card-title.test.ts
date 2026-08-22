import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatProductCardTitle } from "./index";

describe("formatProductCardTitle", () => {
  it("moves тепловізор after the model", () => {
    assert.equal(
      formatProductCardTitle("Тепловізор HikMicro LYNX LH19 3.0"),
      "HikMicro LYNX LH19 3.0 — Тепловізор"
    );
  });

  it("handles longer UK prefixes", () => {
    assert.equal(
      formatProductCardTitle(
        "Тепловізійний приціл Pulsar Thermion 2 XQ50"
      ),
      "Pulsar Thermion 2 XQ50 — Тепловізійний приціл"
    );
  });

  it("handles RU тепловизор", () => {
    assert.equal(
      formatProductCardTitle("Тепловизор HikMicro LYNX LE10 3.0"),
      "HikMicro LYNX LE10 3.0 — Тепловизор"
    );
  });

  it("leaves names without type prefix unchanged", () => {
    assert.equal(
      formatProductCardTitle("HikMicro Condor LRF CQ50L 2.0"),
      "HikMicro Condor LRF CQ50L 2.0"
    );
  });
});
