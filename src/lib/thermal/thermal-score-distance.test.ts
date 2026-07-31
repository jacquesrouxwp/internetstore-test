import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matrixClassPreset } from "./parse-product-thermal";
import {
  crossoverM,
  gapPct,
  performanceGapAt,
  pxOnTarget,
  resolveScore,
  scoreModelAtDistance,
  TARGET_FACTOR,
} from "./thermal-score-distance";

// Canonical presentation pair: budget 256 vs premium 640.
const A = matrixClassPreset(256); // D=1050, NETD 40, ~28k UAH
const B = matrixClassPreset(640); // D=2350, NETD 25, ~120k UAH

describe("resolveScore — Johnson-anchored & saturating", () => {
  it("0 px → 0, saturates to 100 for large px", () => {
    assert.equal(resolveScore(0), 0);
    assert.equal(resolveScore(48), 100);
    assert.equal(resolveScore(1000), 100);
  });

  it("monotone non-decreasing", () => {
    const xs = [0, 1, 2, 4, 6, 8, 10, 13, 18, 24, 34, 48, 80];
    for (let i = 1; i < xs.length; i++) {
      assert.ok(
        resolveScore(xs[i]) >= resolveScore(xs[i - 1]),
        `resolveScore(${xs[i]}) should be ≥ resolveScore(${xs[i - 1]})`
      );
    }
  });

  it("near-range saturation is the source of small gaps (concave)", () => {
    // Gain from 2→8 px must exceed gain from 18→24 px (curve flattens).
    const near = resolveScore(8) - resolveScore(2);
    const far = resolveScore(24) - resolveScore(18);
    assert.ok(near > far);
  });
});

describe("performance gap: small near, large far (the core insight)", () => {
  it("gap@100 m < 5%", () => {
    const { gap } = performanceGapAt(A, B, 100, "deer");
    assert.ok(gap < 5, `expected <5%, got ${gap.toFixed(2)}%`);
  });

  it("gap@800 m > 25%", () => {
    const { gap } = performanceGapAt(A, B, 800, "deer");
    assert.ok(gap > 25, `expected >25%, got ${gap.toFixed(2)}%`);
  });

  it("premium (640) leads at every sampled distance", () => {
    for (const d of [100, 200, 400, 800, 1000]) {
      assert.equal(performanceGapAt(A, B, d, "deer").leader, "b");
    }
  });

  it("gap grows monotonically from near to far range", () => {
    const g100 = performanceGapAt(A, B, 100, "deer").gap;
    const g400 = performanceGapAt(A, B, 400, "deer").gap;
    const g800 = performanceGapAt(A, B, 800, "deer").gap;
    assert.ok(g100 < g400 && g400 < g800);
  });
});

describe("gapPct — bounded & symmetric", () => {
  it("is symmetric in A/B order", () => {
    assert.equal(gapPct(40, 60), gapPct(60, 40));
    assert.equal(
      performanceGapAt(A, B, 800, "deer").gap,
      performanceGapAt(B, A, 800, "deer").gap
    );
  });

  it("0 for identical scores, 100 when one side is 0", () => {
    assert.equal(gapPct(70, 70), 0);
    assert.equal(gapPct(0, 50), 100);
  });

  it("(hi − lo) / hi × 100", () => {
    assert.ok(Math.abs(gapPct(40, 60) - (20 / 60) * 100) < 1e-9);
  });
});

describe("crossoverM — where the models stop being interchangeable", () => {
  it("256 vs 640 crossover (8%) is a short, plausible range", () => {
    const x = crossoverM(A, B, { target: "deer", gapThreshold: 8 });
    assert.ok(x !== null, "expected a crossover distance");
    assert.ok(
      (x as number) > 50 && (x as number) < 300,
      `crossover ${x} m should be in (50, 300)`
    );
  });

  it("below crossover the gap is under threshold, above it is over", () => {
    const x = crossoverM(A, B, { target: "deer", gapThreshold: 8 }) as number;
    assert.ok(performanceGapAt(A, B, x - 20, "deer").gap < 8);
    assert.ok(performanceGapAt(A, B, x, "deer").gap >= 8);
  });

  it("identical models never cross (null)", () => {
    assert.equal(crossoverM(A, A, { target: "deer" }), null);
  });

  it("a larger target pushes the crossover farther out", () => {
    const deer = crossoverM(A, B, { target: "deer" }) as number;
    const fox = crossoverM(A, B, { target: "fox" }) as number;
    // Fox = smaller target → fewer px → models diverge sooner (nearer).
    assert.ok(fox < deer);
  });
});

describe("target selector rescales pixels for both models", () => {
  it("smaller target → fewer pixels on target", () => {
    assert.ok(TARGET_FACTOR.fox < TARGET_FACTOR.deer);
    const deerPx = pxOnTarget(400, A.detectionRangeM, "deer");
    const foxPx = pxOnTarget(400, A.detectionRangeM, "fox");
    assert.ok(foxPx < deerPx);
    // Same ratio applies to model B — both scale identically.
    const ratioB =
      pxOnTarget(400, B.detectionRangeM, "fox") /
      pxOnTarget(400, B.detectionRangeM, "deer");
    assert.ok(Math.abs(ratioB - TARGET_FACTOR.fox / TARGET_FACTOR.deer) < 1e-9);
  });

  it("fog reduces pixels on target", () => {
    assert.ok(
      pxOnTarget(400, A.detectionRangeM, "deer", true) <
        pxOnTarget(400, A.detectionRangeM, "deer", false)
    );
  });
});

describe("scoreModelAtDistance — 3 productivity scores + total (no Value in Total)", () => {
  it("returns integer scores in 0..100", () => {
    const s = scoreModelAtDistance(B, 300, "deer");
    for (const k of ["performance", "range", "image", "total"] as const) {
      assert.ok(Number.isInteger(s[k]));
      assert.ok(s[k] >= 0 && s[k] <= 100, `${k}=${s[k]} out of range`);
    }
  });

  it("Total is independent of price (Value does not enter aggregate)", () => {
    const cheap = scoreModelAtDistance(A, 400, "deer");
    const expensive = scoreModelAtDistance(
      { ...A, priceUah: (A.priceUah || 28000) * 10 },
      400,
      "deer"
    );
    assert.equal(
      cheap.total,
      expensive.total,
      `total must ignore price: ${cheap.total} vs ${expensive.total}`
    );
    assert.equal(cheap.performance, expensive.performance);
    assert.equal(cheap.range, expensive.range);
    assert.equal(cheap.image, expensive.image);
    // value field may still differ (API only) but is not in Total
    assert.ok(cheap.value >= expensive.value);
  });

  it("premium model wins overall total at long range (productivity)", () => {
    const a = scoreModelAtDistance(A, 800, "deer");
    const b = scoreModelAtDistance(B, 800, "deer");
    assert.ok(b.total > a.total);
  });

  it("Total = 0.5·perf + 0.25·range + 0.25·image (rounded)", () => {
    const s = scoreModelAtDistance(B, 500, "deer");
    const expected = Math.round(
      0.5 * s.performance + 0.25 * s.range + 0.25 * s.image
    );
    assert.equal(s.total, expected);
  });
});
