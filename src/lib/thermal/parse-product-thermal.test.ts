import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDetectStatus,
  defaultDetectionRangeM,
  matrixClassPreset,
  parseMatrix,
  parseProductThermal,
  pixelsOnTarget,
} from "./parse-product-thermal";

describe("pixelsOnTarget (Johnson)", () => {
  it("px = 2 × (D / dist)", () => {
    assert.equal(pixelsOnTarget(1000, 1000), 2);
    assert.equal(pixelsOnTarget(500, 1000), 4);
    assert.equal(pixelsOnTarget(250, 1000), 8);
    assert.ok(Math.abs(pixelsOnTarget(1000 / 6.5, 1000) - 13) < 0.01);
  });

  it("clamps dist to at least 1", () => {
    assert.equal(pixelsOnTarget(0, 1000), 2000);
  });
});

describe("computeDetectStatus thresholds", () => {
  const D = 1300;

  it("identify at ≥13 px (≈ D/6.5)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D / 6.5, maxRangeM: D }),
      "identify"
    );
    assert.equal(
      computeDetectStatus({ distanceM: 50, maxRangeM: D }),
      "identify"
    );
  });

  it("recognize at ≥8 and <13 px (≈ D/4)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D / 4, maxRangeM: D }),
      "recognize"
    );
  });

  it("detect at ≥2 and <8 px (at D = exactly detect)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D, maxRangeM: D }),
      "detect"
    );
    assert.equal(
      computeDetectStatus({ distanceM: D / 2, maxRangeM: D }),
      "detect"
    );
  });

  it("none below 2 px", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D * 2, maxRangeM: D }),
      "none"
    );
  });

  it("fog reduces effective pixels", () => {
    // At D/4 clear → recognize (8px); with fog 8*0.6=4.8 → still detect
    assert.equal(
      computeDetectStatus({
        distanceM: D / 4,
        maxRangeM: D,
        fog: true,
      }),
      "detect"
    );
  });
});

describe("defaultDetectionRangeM", () => {
  it("mid industry defaults by matrix", () => {
    assert.equal(defaultDetectionRangeM(256), 1050);
    assert.equal(defaultDetectionRangeM(384), 1600);
    assert.equal(defaultDetectionRangeM(640), 2350);
  });
});

describe("parseMatrix — no false positives from bare numbers", () => {
  it("parses full WxH from resolution", () => {
    assert.equal(parseMatrix("640x512", null), 640);
    assert.equal(parseMatrix("384×288", null), 384);
    assert.equal(parseMatrix("256x192", null), 256);
  });

  it("parses from specs Матриця, not from name-like noise", () => {
    assert.equal(
      parseMatrix(null, { Матриця: "640×512" }),
      640
    );
    // Bare 640 without matrix context in resolution-only path
    assert.equal(parseMatrix("640", null), 640);
  });

  it("does not treat random 640 in unrelated specs as matrix alone", () => {
    // No resolution, specs only have price-like field — default 384
    assert.equal(parseMatrix(null, { Ціна: "64000 грн" }), 384);
  });

  it("defaults to 384 when empty", () => {
    assert.equal(parseMatrix(null, null), 384);
    assert.equal(parseMatrix("", {}), 384);
  });
});

describe("parseProductThermal", () => {
  it("uses passport range and specs NETD", () => {
    const p = parseProductThermal({
      resolution: "640x512",
      detectionRangeM: 2100,
      specs: { NETD: "≤25 mK", Частота: "50 Гц" },
      name: "Model 640 Super", // name must not break matrix
    });
    assert.equal(p.matrix, 640);
    assert.equal(p.detectionRangeM, 2100);
    assert.equal(p.netdMk, 25);
    assert.equal(p.refreshRateHz, 50);
  });

  it("falls back to matrix default D", () => {
    const p = parseProductThermal({ resolution: "256x192" });
    assert.equal(p.matrix, 256);
    assert.equal(p.detectionRangeM, 1050);
  });
});

describe("matrixClassPreset", () => {
  it("256/384/640 class defaults", () => {
    assert.equal(matrixClassPreset(256).detectionRangeM, 1050);
    assert.equal(matrixClassPreset(256).netdMk, 40);
    assert.equal(matrixClassPreset(384).detectionRangeM, 1600);
    assert.equal(matrixClassPreset(640).detectionRangeM, 2350);
    assert.equal(matrixClassPreset(640).netdMk, 25);
  });
});
