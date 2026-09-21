import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { simulatorHref, simulatorPresetFromQuery, specNetdMk } from "./simulator-link";

const base = {
  matrix: 384 as const,
  detectionRangeM: 1800,
  netdMk: 15,
  refreshRateHz: 50,
  label: "AGM Adder V2 35-384",
  focalMm: 35,
  pitchUm: 12,
};

describe("simulatorHref", () => {
  it("carries the device optics", () => {
    assert.equal(simulatorHref(base), "/simulator?res=384&pitch=12&lens=35&netd=15");
  });

  it("omits what the card doesn't state", () => {
    assert.equal(
      simulatorHref({ ...base, focalMm: null, pitchUm: null }),
      "/simulator?res=384&netd=15"
    );
  });
});

describe("simulatorPresetFromQuery", () => {
  it("round-trips a product link", () => {
    assert.deepEqual(
      simulatorPresetFromQuery({ res: "384", pitch: "12", lens: "35", netd: "15" }),
      { matrixW: 384, pitchUm: 12, focalMm: 35, netdMk: 15 }
    );
  });

  it("drops values the sandbox can't render", () => {
    assert.deepEqual(
      simulatorPresetFromQuery({ res: "300", pitch: "11", lens: "abc", netd: "-5" }),
      {}
    );
  });

  it("returns nothing for a plain visit", () => {
    assert.deepEqual(simulatorPresetFromQuery({}), {});
  });
});

describe("specNetdMk", () => {
  it("reads NETD from any key that names it", () => {
    assert.equal(specNetdMk({ "Різниця температур матриці (NETD)": "15" }), 15);
    assert.equal(specNetdMk({ "NETD, мК": "≤25" }), 25);
    assert.equal(specNetdMk({ NETD: "0,035 K" }), 35);
  });

  it("returns null when the card doesn't state it", () => {
    assert.equal(specNetdMk({ "Матриця": "384x288" }), null);
    assert.equal(specNetdMk(null), null);
  });
});
