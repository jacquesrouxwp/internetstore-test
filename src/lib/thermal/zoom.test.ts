import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEER_FRAC_AT_MIN,
  DEER_FRAC_MIN,
  FEET_FRAC_AT_MIN,
  HORIZON_FRAC,
  deerFeetYFrac,
  deerHeightFrac,
  deerScreenRect,
  defaultSimDistanceM,
  digitalZoomCrop,
} from "./zoom";

describe("deerHeightFrac — real recession ∝ 1/d", () => {
  it("at 50 m → hero size", () => {
    assert.ok(Math.abs(deerHeightFrac(50) - DEER_FRAC_AT_MIN) < 1e-9);
  });

  it("at 1000 m is ~1/20 of size at 50 m (really farther)", () => {
    const r = deerHeightFrac(1000) / deerHeightFrac(50);
    assert.ok(Math.abs(r - 50 / 1000) < 1e-6, `ratio ${r}`);
    // Absolute: tiny hot mark, not a big animal
    assert.ok(deerHeightFrac(1000) < 0.04);
    assert.ok(deerHeightFrac(1000) > DEER_FRAC_MIN);
  });

  it("100 m is half of 50 m; 200 m is quarter", () => {
    assert.ok(Math.abs(deerHeightFrac(100) / deerHeightFrac(50) - 0.5) < 1e-6);
    assert.ok(Math.abs(deerHeightFrac(200) / deerHeightFrac(50) - 0.25) < 1e-6);
  });
});

describe("deerFeetYFrac — ground plane, no mid-trunk float", () => {
  it("at 50 m feet on foreground litter", () => {
    assert.ok(Math.abs(deerFeetYFrac(50) - FEET_FRAC_AT_MIN) < 1e-9);
  });

  it("at 1000 m feet still on ground band (below canopy)", () => {
    const y = deerFeetYFrac(1000);
    assert.ok(y >= HORIZON_FRAC, `above horizon: ${y}`);
    assert.ok(y < FEET_FRAC_AT_MIN);
    // Must not be mid-trunk (~0.5–0.6)
    assert.ok(y > 0.7, `too high in frame (trunk zone): ${y}`);
  });

  it("size and ground offset share the same 1/d law", () => {
    const rH = deerHeightFrac(400) / deerHeightFrac(100);
    const rG =
      (deerFeetYFrac(400) - HORIZON_FRAC) / (deerFeetYFrac(100) - HORIZON_FRAC);
    assert.ok(Math.abs(rH - rG) < 1e-6, `desync ${rH} vs ${rG}`);
  });
});

describe("deerScreenRect", () => {
  it("plants feet on ground row", () => {
    const r = deerScreenRect(200, 480, 270, 0.85);
    assert.ok(Math.abs(r.feetY - deerFeetYFrac(200) * 270) < 1e-6);
    assert.ok(Math.abs(r.y + r.h - r.feetY) < 1e-6);
  });

  it("full deer in frame at 50 m", () => {
    const r = deerScreenRect(50, 480, 270, 0.85);
    assert.ok(r.y >= -2, `clipped top ${r.y}`);
    assert.ok(r.y + r.h <= 272);
  });

  it("at 1000 m deer is a few pixels tall (really distant)", () => {
    const r = deerScreenRect(1000, 480, 270, 0.85);
    assert.ok(r.h < 12, `too tall at 1000m: ${r.h}px`);
    assert.ok(r.h >= 1);
  });
});

describe("digitalZoomCrop", () => {
  it("×1 full", () => {
    assert.deepEqual(digitalZoomCrop(240, 135, 1, 0.5, 0.5), {
      sx: 0,
      sy: 0,
      sw: 240,
      sh: 135,
    });
  });
});

describe("defaultSimDistanceM", () => {
  it("mid-near so recession is already visible", () => {
    const d = defaultSimDistanceM(1600);
    assert.ok(d >= 180 && d <= 280);
    assert.ok(deerHeightFrac(d) < deerHeightFrac(50) * 0.4);
  });
});
