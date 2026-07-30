import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDetectStatus,
  computeDetectStatusVisual,
  defaultDetectionRangeM,
  DEFAULT_FOV_VERT_DEG,
  effectivePixelsOnTarget,
  fovVerticalRadFromOptics,
  johnsonBandDistancesM,
  opticsTargetHeightFrac,
  parseFocalMm,
  JOHNSON_PX,
  matrixClassPreset,
  matrixPixelHeight,
  matrixPixelWidth,
  matrixVertPixels,
  parseMatrix,
  parseProductThermal,
  pixelsOnTarget,
  renderTargetHeightFrac,
  renderedCriticalGrainPx,
  resolveFovVerticalRad,
  targetFrameHeightFrac,
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

describe("FOV-based target size (optics)", () => {
  it("human at 50 m is ~15–25% of frame with default FOV ~11°", () => {
    const fov = (DEFAULT_FOV_VERT_DEG * Math.PI) / 180;
    const frac = targetFrameHeightFrac(1.8, 50, fov, 1);
    assert.ok(frac >= 0.15 && frac <= 0.25, `frac=${frac}`);
  });

  it("human at 200 m is much smaller than at 50 m", () => {
    const fov = (DEFAULT_FOV_VERT_DEG * Math.PI) / 180;
    const a = targetFrameHeightFrac(1.8, 50, fov, 1);
    const b = targetFrameHeightFrac(1.8, 200, fov, 1);
    assert.ok(b < a * 0.35, `50m=${a} 200m=${b}`);
    assert.ok(b < 0.08, `still too large at 200m: ${b}`);
  });

  it("at long range (passport D) target is a tiny hot mark", () => {
    const params = { matrix: 384 as const, focalMm: 25, pitchUm: 12 };
    const D = 1600;
    const frac = opticsTargetHeightFrac(1.8, D, params, 1);
    const sensorH = frac * matrixPixelHeight(384);
    // blob, not a figure — a few px at most
    assert.ok(sensorH < 6, `sensorH at D=${sensorH}`);
    assert.ok(frac < 0.05);
  });

  it("longer focal → larger target at same distance", () => {
    const short = opticsTargetHeightFrac(1.3, 100, {
      matrix: 384,
      focalMm: 15,
      pitchUm: 12,
    });
    const long = opticsTargetHeightFrac(1.3, 100, {
      matrix: 384,
      focalMm: 50,
      pitchUm: 12,
    });
    assert.ok(long > short * 2.5, `15mm=${short} 50mm=${long}`);
  });

  it("fox visual height smaller than deer at same range/optics", () => {
    const p = { matrix: 640 as const, focalMm: 35, pitchUm: 12 };
    const deer = opticsTargetHeightFrac(1.3, 100, p);
    const fox = opticsTargetHeightFrac(0.4, 100, p);
    assert.ok(Math.abs(fox / deer - 0.4 / 1.3) < 0.02);
  });

  it("fog-independent: same inputs → same size (no fog in formula)", () => {
    const a = opticsTargetHeightFrac(1.8, 50, {
      matrix: 640,
      focalMm: 35,
      pitchUm: 12,
    });
    const b = opticsTargetHeightFrac(1.8, 50, {
      matrix: 640,
      focalMm: 35,
      pitchUm: 12,
    });
    assert.equal(a, b);
  });

  it("FOV from optics formula matches 2×atan(H/(2f))", () => {
    const rad = fovVerticalRadFromOptics(288, 12, 25);
    const sensorH = (12 * 288) / 1000;
    const expect = 2 * Math.atan(sensorH / (2 * 25));
    assert.ok(Math.abs(rad - expect) < 1e-12);
  });

  it("missing optics → default FOV ~11°", () => {
    const rad = resolveFovVerticalRad({
      matrix: 384,
      focalMm: null,
      pitchUm: null,
    });
    assert.ok(
      Math.abs(rad - (DEFAULT_FOV_VERT_DEG * Math.PI) / 180) < 1e-12
    );
  });

  it("matrixVertPixels matches real sensors", () => {
    assert.equal(matrixVertPixels(256), 192);
    assert.equal(matrixVertPixels(384), 288);
    assert.equal(matrixVertPixels(640), 512);
  });
});

describe("parseFocalMm", () => {
  it("reads lens from specs", () => {
    assert.equal(
      parseFocalMm({ "Об'єктив": "35 мм" }, null),
      35
    );
  });

  it("reads from model name LE15 / LH25 / CQ50 / 640-50", () => {
    assert.equal(parseFocalMm(null, "Hikmicro LYNX LE15 3.0"), 15);
    assert.equal(parseFocalMm(null, "LH25 3.0"), 25);
    assert.equal(parseFocalMm(null, "CONDOR LRF CQ50L 2.0"), 50);
    assert.equal(parseFocalMm(null, "Pard Leopard 640-50 LRF"), 50);
  });
});

describe("render + status sync (detect never on empty frame)", () => {
  const human = { visual: 1.8, critical: 0.75 };
  const params = { matrix: 384 as const, focalMm: 15, pitchUm: 12 };
  const D = 1150;

  it("at 50 m FOV size ~15–25%, status at least detect (not empty)", () => {
    const frac = renderTargetHeightFrac(
      human.visual,
      human.critical,
      50,
      D,
      params
    );
    assert.ok(frac >= 0.12 && frac <= 0.3, `frac=${frac}`);
    const st = computeDetectStatusVisual({
      visualHeightM: human.visual,
      criticalSizeM: human.critical,
      distanceM: 50,
      detectionRangeM: D,
      ...params,
      fog: false,
    });
    // 15 mm / 384: ~7 crit grain → detect; longer f reaches recognize/identify
    assert.ok(st !== "none", st);
  });

  it("at 50 m with 35 mm lens reaches recognize/identify", () => {
    const st = computeDetectStatusVisual({
      visualHeightM: human.visual,
      criticalSizeM: human.critical,
      distanceM: 50,
      detectionRangeM: 1600,
      matrix: 384,
      focalMm: 35,
      pitchUm: 12,
      fog: false,
    });
    assert.ok(st === "identify" || st === "recognize", st);
  });

  it("at passport D: status detect AND critical grain ≥ 2", () => {
    const st = computeDetectStatusVisual({
      visualHeightM: human.visual,
      criticalSizeM: human.critical,
      distanceM: D,
      detectionRangeM: D,
      ...params,
      fog: false,
    });
    assert.equal(st, "detect");
    const crit = renderedCriticalGrainPx(
      human.visual,
      human.critical,
      D,
      D,
      params,
      false
    );
    assert.ok(crit >= 2, `crit grain ${crit}`);
  });

  it("beyond D: status none", () => {
    const st = computeDetectStatusVisual({
      visualHeightM: human.visual,
      criticalSizeM: human.critical,
      distanceM: D * 1.5,
      detectionRangeM: D,
      ...params,
      fog: false,
    });
    assert.equal(st, "none");
  });

  it("fog can demote recognize → detect without shrinking geometry floor path", () => {
    // Mid-near: clear may be identify; fog multiplies critical by 0.6
    const clear = computeDetectStatusVisual({
      visualHeightM: human.visual,
      criticalSizeM: human.critical,
      distanceM: D / 4,
      detectionRangeM: D,
      ...params,
      fog: false,
    });
    const foggy = computeDetectStatusVisual({
      visualHeightM: human.visual,
      criticalSizeM: human.critical,
      distanceM: D / 4,
      detectionRangeM: D,
      ...params,
      fog: true,
    });
    // fog status is equal or worse
    const rank = { none: 0, detect: 1, recognize: 2, identify: 3 };
    assert.ok(rank[foggy] <= rank[clear]);
  });

  it("fox at long range collapses sooner than deer (same device)", () => {
    const p = { matrix: 640 as const, focalMm: 35, pitchUm: 12 };
    const Dpass = 1900;
    // Same absolute distance far for fox critical D
    const dist = 700;
    const foxSt = computeDetectStatusVisual({
      visualHeightM: 0.4,
      criticalSizeM: 0.3,
      distanceM: dist,
      detectionRangeM: Math.round((Dpass * 0.3) / 0.75),
      ...p,
      fog: false,
    });
    const deerSt = computeDetectStatusVisual({
      visualHeightM: 1.3,
      criticalSizeM: 1.0,
      distanceM: dist,
      detectionRangeM: Math.round((Dpass * 1.0) / 0.75),
      ...p,
      fog: false,
    });
    const rank = { none: 0, detect: 1, recognize: 2, identify: 3 };
    assert.ok(
      rank[foxSt] <= rank[deerSt],
      `fox=${foxSt} deer=${deerSt}`
    );
  });
});

describe("matrixPixelHeight aspect", () => {
  it("4:3 relative to width (thermal sensor)", () => {
    assert.equal(matrixPixelHeight(640), Math.round(240 * 3 / 4));
    assert.equal(matrixPixelHeight(256), Math.round(96 * 3 / 4));
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

  it("parses focal from model name when specs omit lens", () => {
    const p = parseProductThermal({
      name: "LYNX LE19 3.0",
      resolution: "384x288",
      detectionRangeM: 900,
      specs: { NETD: "35 mK" },
    });
    assert.equal(p.focalMm, 19);
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
