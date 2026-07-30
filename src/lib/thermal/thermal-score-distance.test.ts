import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crossoverM,
  gapPct,
  performanceAtDistance,
  pixelsOnTarget,
  resolveScore,
  scoresAtDistance,
  sensorFromSpecs,
  type Sensor,
} from "./thermal-score-distance";
import type { Specs } from "./thermal-score";

const budget256: Specs = {
  hPixels: 256,
  vPixels: 192,
  pixelPitchUm: 12,
  netdMk: 40,
  refreshHz: 25,
  detectionRangeM: 900,
  priceEur: 450,
};

const mid640: Specs = {
  hPixels: 640,
  vPixels: 512,
  pixelPitchUm: 12,
  netdMk: 25,
  refreshHz: 50,
  detectionRangeM: 2300,
  priceEur: 1400,
};

const sensor256: Sensor = sensorFromSpecs(budget256);
const sensor640: Sensor = sensorFromSpecs(mid640);

describe("pixelsOnTarget / resolveScore", () => {
  it("at d = D_human, human → 2 px", () => {
    const D = 1200;
    const s: Sensor = { detectionRangeHumanM: D, hPixels: 384, pixelPitchUm: 12 };
    assert.ok(Math.abs(pixelsOnTarget(s, "human", D) - 2) < 1e-9);
  });

  it("resolveScore bands follow Johnson 2/8/13", () => {
    assert.ok(resolveScore(2) >= 50 && resolveScore(2) <= 55);
    assert.ok(resolveScore(8) >= 80);
    assert.ok(resolveScore(13) >= 95);
    assert.equal(resolveScore(0), 0);
  });
});

describe("distance gap 256 vs 640", () => {
  it("at 100 m gap is small (<5%) — both nearly saturated", () => {
    const a = performanceAtDistance(mid640, sensor640, 100, "human");
    const b = performanceAtDistance(budget256, sensor256, 100, "human");
    const g = Math.abs(gapPct(a, b));
    // Buyer insight: close range → no point overpaying
    assert.ok(a >= 90 && b >= 90, `both should be high at 100m: a=${a} b=${b}`);
    assert.ok(g < 5, `gap at 100m must be <5%, got ${g}% (a=${a} b=${b})`);
  });

  it("at 800 m 640 is clearly better (gap > 25%)", () => {
    const a = performanceAtDistance(mid640, sensor640, 800, "human");
    const b = performanceAtDistance(budget256, sensor256, 800, "human");
    const g = gapPct(a, b);
    assert.ok(a > b, `640 should beat 256 at 800m: ${a} vs ${b}`);
    assert.ok(g > 25, `gap at 800m should be >25%, got ${g}% (a=${a} b=${b})`);
  });

  it("at 1000 m gap stays large (>25%)", () => {
    const a = performanceAtDistance(mid640, sensor640, 1000, "human");
    const b = performanceAtDistance(budget256, sensor256, 1000, "human");
    const g = gapPct(a, b);
    assert.ok(a > b);
    assert.ok(g > 25, `gap at 1000m should be >25%, got ${g}%`);
  });

  it("crossover 256 vs 640 in reasonable range", () => {
    const d = crossoverM(
      { s: budget256, sensor: sensor256 },
      { s: mid640, sensor: sensor640 },
      8,
      "human"
    );
    assert.ok(d >= 50 && d <= 2500, `crossover ${d}`);
    // Advantage should appear well before max D of 640
    assert.ok(d < mid640.detectionRangeM);
    // At crossover distance, gap of better vs cheap ≈ threshold
    const a = performanceAtDistance(mid640, sensor640, d, "human");
    const b = performanceAtDistance(budget256, sensor256, d, "human");
    assert.ok(gapPct(a, b) >= 8, `at crossover ${d}m gap should be ≥8%, got ${gapPct(a, b)}`);
  });

  it("A/B symmetry: gapPct(a,b) = −gapPct(b,a) within rounding", () => {
    for (const d of [100, 400, 800, 1200]) {
      const a = performanceAtDistance(mid640, sensor640, d, "human");
      const b = performanceAtDistance(budget256, sensor256, d, "human");
      const gab = gapPct(a, b);
      const gba = gapPct(b, a);
      // (a−b)/b vs (b−a)/a are not exact negatives, but signs flip
      assert.ok(
        Math.sign(gab) === -Math.sign(gba) || (gab === 0 && gba === 0),
        `sign symmetry at ${d}m: gap(a,b)=${gab} gap(b,a)=${gba}`
      );
      // Swapping labels must not change who wins
      assert.equal(a > b, gapPct(a, b) > 0 || a === b);
    }
  });

  it("performance is monotonic decreasing with distance (same model)", () => {
    let prev = performanceAtDistance(mid640, sensor640, 50, "deer");
    for (const d of [100, 200, 400, 800, 1600]) {
      const p = performanceAtDistance(mid640, sensor640, d, "deer");
      assert.ok(p <= prev + 1, `non-monotonic: ${d}m ${p} > prev ${prev}`);
      prev = p;
    }
  });
});

describe("scoresAtDistance", () => {
  it("all four cards + total update with distance", () => {
    const near = scoresAtDistance(mid640, sensor640, 100, "human");
    const far = scoresAtDistance(mid640, sensor640, 2000, "human");
    assert.ok(near.thermalPerformance >= far.thermalPerformance);
    assert.ok(near.detectionRange >= far.detectionRange);
    assert.ok(near.total === near.thermalPerformance);
    assert.ok(near.pixelsOnTarget > far.pixelsOnTarget);
  });

  it("determinism", () => {
    const a = scoresAtDistance(mid640, sensor640, 500, "deer");
    const b = scoresAtDistance(mid640, sensor640, 500, "deer");
    assert.deepEqual(a, b);
  });

  it("fox collapses sooner than human at same d", () => {
    const human = scoresAtDistance(mid640, sensor640, 600, "human");
    const fox = scoresAtDistance(mid640, sensor640, 600, "fox");
    assert.ok(fox.detectionRange <= human.detectionRange);
  });
});
