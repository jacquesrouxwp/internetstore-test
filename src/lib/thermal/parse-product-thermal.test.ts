import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDetectStatus,
  defaultDetectionRangeM,
  effectivePixelsOnTarget,
  johnsonBandDistancesM,
  johnsonDeerHeightFrac,
  JOHNSON_PX,
  matrixClassPreset,
  matrixPixelHeight,
  matrixPixelWidth,
  parseMatrix,
  parseProductThermal,
  pixelsOnTarget,
} from "./parse-product-thermal";

describe("pixelsOnTarget (Johnson)", () => {
  it("px = 2 × (D / dist); at dist=D → exactly 2", () => {
    assert.equal(pixelsOnTarget(1000, 1000), 2);
    assert.equal(pixelsOnTarget(500, 1000), 4);
    assert.equal(pixelsOnTarget(250, 1000), 8);
    assert.ok(Math.abs(pixelsOnTarget(1000 / 6.5, 1000) - 13) < 0.01);
  });

  it("clamps dist to at least 1", () => {
    assert.equal(pixelsOnTarget(0, 1000), 2000);
  });
});

describe("computeDetectStatus thresholds (hard)", () => {
  const D = 1300;

  it("identify at ≥13 px (dist ≤ 2D/13)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: (2 * D) / 13, maxRangeM: D }),
      "identify"
    );
    assert.equal(
      computeDetectStatus({ distanceM: 50, maxRangeM: D }),
      "identify"
    );
  });

  it("recognize at ≥8 and <13 (dist = D/4)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D / 4, maxRangeM: D }),
      "recognize"
    );
  });

  it("detect at ≥2 and <8 (dist = D and D/2)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D, maxRangeM: D }),
      "detect"
    );
    assert.equal(
      computeDetectStatus({ distanceM: D / 2, maxRangeM: D }),
      "detect"
    );
  });

  it("none below 2 px (dist > D)", () => {
    assert.equal(
      computeDetectStatus({ distanceM: D * 2, maxRangeM: D }),
      "none"
    );
  });

  it("fog can demote recognize → detect", () => {
    assert.equal(
      computeDetectStatus({
        distanceM: D / 4,
        maxRangeM: D,
        fog: true,
      }),
      "detect"
    );
  });

  it("boundary: just below 13 is recognize", () => {
    // px = 12.9
    const dist = (2 * D) / 12.9;
    assert.equal(
      computeDetectStatus({ distanceM: dist, maxRangeM: D }),
      "recognize"
    );
  });

  it("boundary: just below 8 is detect", () => {
    const dist = (2 * D) / 7.9;
    assert.equal(
      computeDetectStatus({ distanceM: dist, maxRangeM: D }),
      "detect"
    );
  });
});

describe("johnsonBandDistancesM", () => {
  it("matches Johnson inverses", () => {
    const D = 2000;
    const b = johnsonBandDistancesM(D);
    assert.equal(b.detectMaxM, 2000);
    assert.equal(b.recognizeMaxM, Math.round((2 * D) / 8));
    assert.equal(b.identifyMaxM, Math.round((2 * D) / 13));
  });
});

describe("johnsonDeerHeightFrac — visual sensor px ≈ Johnson px", () => {
  it("at dist=D, sensor height ≈ 2 px for any matrix", () => {
    for (const m of [256, 384, 640] as const) {
      const D = defaultDetectionRangeM(m);
      const frac = johnsonDeerHeightFrac(D, D, m, false, 270);
      const sensorH = frac * matrixPixelHeight(m);
      assert.ok(
        Math.abs(sensorH - 2) < 0.15,
        `matrix ${m}: sensorH=${sensorH} want ~2`
      );
    }
  });

  it("at dist=D/4, sensor height ≈ 8 px (recognize)", () => {
    const m = 640;
    const D = 2000;
    const frac = johnsonDeerHeightFrac(D / 4, D, m, false, 270);
    const sensorH = frac * matrixPixelHeight(m);
    assert.ok(Math.abs(sensorH - 8) < 0.2, `got ${sensorH}`);
  });

  it("at dist=2D/13, sensor height ≈ 13 px (identify)", () => {
    const m = 384;
    const D = 1600;
    const dist = (2 * D) / 13;
    const frac = johnsonDeerHeightFrac(dist, D, m, false, 270);
    const sensorH = frac * matrixPixelHeight(m);
    assert.ok(Math.abs(sensorH - 13) < 0.25, `got ${sensorH}`);
  });

  it("fog shrinks visual size with effective px", () => {
    const clear = johnsonDeerHeightFrac(400, 1600, 640, false, 270);
    const foggy = johnsonDeerHeightFrac(400, 1600, 640, true, 270);
    assert.ok(foggy < clear);
    assert.ok(
      Math.abs(foggy / clear - 0.6) < 0.05,
      `ratio ${foggy / clear}`
    );
  });
});

describe("matrixPixelHeight aspect", () => {
  it("16:9 relative to width", () => {
    assert.equal(matrixPixelHeight(640), Math.round(240 * 9 / 16));
    assert.equal(matrixPixelHeight(256), Math.round(96 * 9 / 16));
  });
});

describe("defaultDetectionRangeM", () => {
  it("mid industry defaults by matrix", () => {
    assert.equal(defaultDetectionRangeM(256), 1050);
    assert.equal(defaultDetectionRangeM(384), 1600);
    assert.equal(defaultDetectionRangeM(640), 2350);
  });
});

describe("parseMatrix — no false positives", () => {
  it("parses full WxH", () => {
    assert.equal(parseMatrix("640x512", null), 640);
    assert.equal(parseMatrix("384×288", null), 384);
    assert.equal(parseMatrix("256x192", null), 256);
  });

  it("does not treat 64000 as matrix", () => {
    assert.equal(parseMatrix(null, { Ціна: "64000 грн" }), 384);
  });

  it("defaults to 384 when empty", () => {
    assert.equal(parseMatrix(null, null), 384);
  });
});

describe("parseProductThermal", () => {
  it("uses passport range and specs NETD", () => {
    const p = parseProductThermal({
      resolution: "640x512",
      detectionRangeM: 2100,
      specs: { NETD: "≤25 mK", Частота: "50 Гц" },
      name: "Model 640 Super",
    });
    assert.equal(p.matrix, 640);
    assert.equal(p.detectionRangeM, 2100);
    assert.equal(p.netdMk, 25);
  });
});

describe("matrixClassPreset", () => {
  it("256/384/640 class defaults", () => {
    assert.equal(matrixClassPreset(256).detectionRangeM, 1050);
    assert.equal(matrixClassPreset(640).netdMk, 25);
  });
});

describe("JOHNSON_PX constants", () => {
  it("classic 2 / 8 / 13", () => {
    assert.equal(JOHNSON_PX.detect, 2);
    assert.equal(JOHNSON_PX.recognize, 8);
    assert.equal(JOHNSON_PX.identify, 13);
  });
});

describe("effectivePixelsOnTarget", () => {
  it("fog multiplies by 0.6", () => {
    assert.ok(
      Math.abs(
        effectivePixelsOnTarget(500, 1000, true) -
          effectivePixelsOnTarget(500, 1000, false) * 0.6
      ) < 1e-9
    );
  });
});

describe("matrixPixelWidth", () => {
  it("grain ladder", () => {
    assert.equal(matrixPixelWidth(256), 96);
    assert.equal(matrixPixelWidth(384), 144);
    assert.equal(matrixPixelWidth(640), 240);
  });
});
