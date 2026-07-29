import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEER_FRAC_AT_MIN,
  DEER_FRAC_MIN,
  DIST_MIN_M,
  HORIZON_FRAC,
  FEET_FRAC_AT_MIN,
  atmosphericTransmission,
  deerFeetYFrac,
  deerHeightFrac,
  deerScreenRect,
  defaultSimDistanceM,
  digitalZoomCrop,
} from "./zoom";

const D = 1600;

describe("deerHeightFrac — apparent size ∝ 1/distance", () => {
  it("at DIST_MIN → hero fraction", () => {
    assert.ok(Math.abs(deerHeightFrac(DIST_MIN_M) - DEER_FRAC_AT_MIN) < 1e-9);
  });

  it("halving inverse-distance halves apparent size", () => {
    // 100 m is 2× farther than 50 m → deer half as tall
    assert.ok(Math.abs(deerHeightFrac(100) / deerHeightFrac(50) - 0.5) < 1e-6);
    // 200 m → quarter of 50 m
    assert.ok(Math.abs(deerHeightFrac(200) / deerHeightFrac(50) - 0.25) < 1e-6);
  });

  it("strictly shrinks with distance until the floor", () => {
    const samples = [50, 100, 200, 400, 800, 1200];
    for (let i = 1; i < samples.length; i++) {
      assert.ok(
        deerHeightFrac(samples[i]) < deerHeightFrac(samples[i - 1]),
        `frac(${samples[i]}) should be < frac(${samples[i - 1]})`
      );
    }
  });

  it("far deer collapses to a small hot mark (not a big animal)", () => {
    // The old bug: deer stayed ~0.7 of frame at any range.
    assert.ok(deerHeightFrac(2350) < 0.03, `far deer too big: ${deerHeightFrac(2350)}`);
    assert.ok(deerHeightFrac(2350) >= DEER_FRAC_MIN);
  });

  it("clamps below DIST_MIN to the hero fraction", () => {
    assert.equal(deerHeightFrac(10), deerHeightFrac(DIST_MIN_M));
  });
});

describe("deerFeetYFrac — ground-plane projection ∝ 1/distance", () => {
  it("at DIST_MIN → feet low in the frame", () => {
    assert.ok(Math.abs(deerFeetYFrac(DIST_MIN_M) - FEET_FRAC_AT_MIN) < 1e-9);
  });

  it("rises toward the horizon as distance grows (never past it)", () => {
    const samples = [50, 100, 400, 1600, 5000];
    for (let i = 1; i < samples.length; i++) {
      assert.ok(deerFeetYFrac(samples[i]) < deerFeetYFrac(samples[i - 1]));
    }
    assert.ok(deerFeetYFrac(100000) > HORIZON_FRAC);
    assert.ok(deerFeetYFrac(100000) - HORIZON_FRAC < 0.01);
  });

  it("size and feet move together (same 1/d law) — no float", () => {
    // ratio of (feetY - horizon) tracks ratio of height
    const rH = deerHeightFrac(400) / deerHeightFrac(100);
    const rG =
      (deerFeetYFrac(400) - HORIZON_FRAC) / (deerFeetYFrac(100) - HORIZON_FRAC);
    assert.ok(Math.abs(rH - rG) < 1e-6, `size/ground desync: ${rH} vs ${rG}`);
  });
});

describe("deerScreenRect — pixel geometry", () => {
  it("centers horizontally and plants feet on the ground row", () => {
    const r = deerScreenRect(200, 480, 270, 0.8);
    assert.ok(Math.abs(r.cx - 240) < 1e-6);
    const feetY = r.y + r.h;
    assert.ok(Math.abs(feetY - deerFeetYFrac(200) * 270) < 1e-6);
  });

  it("preserves sprite aspect ratio", () => {
    const aspect = 0.83;
    const r = deerScreenRect(150, 480, 270, aspect);
    assert.ok(Math.abs(r.w / r.h - aspect) < 1e-6);
  });

  it("full deer fits within the frame at the near hero distance", () => {
    const r = deerScreenRect(DIST_MIN_M, 480, 270, 0.8);
    assert.ok(r.y >= 0, `antlers clipped at top: ${r.y}`);
    assert.ok(r.y + r.h <= 270 + 1, `hooves below frame: ${r.y + r.h}`);
  });
});

describe("digitalZoomCrop — magnify sensor image, no new detail", () => {
  it("×1 returns the full sensor", () => {
    const c = digitalZoomCrop(240, 135, 1, 0.5, 0.5);
    assert.deepEqual(c, { sx: 0, sy: 0, sw: 240, sh: 135 });
  });

  it("×2 crops to a quarter area, centered on focus", () => {
    const c = digitalZoomCrop(240, 135, 2, 0.5, 0.5);
    assert.equal(c.sw, 120);
    assert.equal(c.sh, 67.5);
    assert.equal(c.sx, 60);
    assert.equal(c.sy, 33.75);
  });

  it("clamps the crop inside the sensor near edges", () => {
    const c = digitalZoomCrop(240, 135, 2, 0.95, 0.95);
    assert.ok(c.sx + c.sw <= 240);
    assert.ok(c.sy + c.sh <= 135);
    assert.ok(c.sx >= 0 && c.sy >= 0);
  });
});

describe("atmosphericTransmission — distant contrast washes out", () => {
  it("near ≈ full, at D drops to the floor", () => {
    assert.ok(atmosphericTransmission(50, D, false) > 0.95);
    assert.ok(atmosphericTransmission(D, D, false) <= 0.4);
  });

  it("monotonically decreases with distance", () => {
    const a = atmosphericTransmission(100, D, false);
    const b = atmosphericTransmission(800, D, false);
    assert.ok(b < a);
  });

  it("fog attenuates further", () => {
    assert.ok(
      atmosphericTransmission(400, D, true) < atmosphericTransmission(400, D, false)
    );
  });
});

describe("defaultSimDistanceM — clear, huntable first impression", () => {
  it("lands in a mid-near band (~140–220 m)", () => {
    const d = defaultSimDistanceM(2350);
    assert.ok(d >= 140 && d <= 220, `default out of band: ${d}`);
  });

  it("shows a clearly visible deer by default (not a far dot)", () => {
    assert.ok(deerHeightFrac(defaultSimDistanceM(2350)) > 0.12);
  });
});
