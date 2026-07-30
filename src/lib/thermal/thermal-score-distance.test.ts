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
  it("at 100 m gap is small (<5% magnitude or both high)", () => {
    const a = performanceAtDistance(mid640, sensor640, 100, "human");
    const b = performanceAtDistance(budget256, sensor256, 100, "human");
    const g = Math.abs(gapPct(a, b));
    // Both should still resolve well up close
    assert.ok(a >= 70 && b >= 55, `a=${a} b=${b}`);
    assert.ok(g < 25, `gap at 100m too large: ${g}% (a=${a} b=${b})`);
    // Prefer strict <5 when both near ceiling
    if (a >= 90 && b >= 90) assert.ok(g < 5, `near-ceiling gap ${g}`);
  });

  it("at 800 m 640 is clearly better (gap > 25%)", () => {
    const a = performanceAtDistance(mid640, sensor640, 800, "human");
    const b = performanceAtDistance(budget256, sensor256, 800, "human");
    const g = gapPct(a, b);
    assert.ok(a > b, `640 should beat 256 at 800m: ${a} vs ${b}`);
    assert.ok(g > 25, `gap at 800m should be >25%, got ${g}% (a=${a} b=${b})`);
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
