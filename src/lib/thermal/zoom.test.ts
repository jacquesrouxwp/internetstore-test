import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIST_MIN_M,
  ZOOM_FAR,
  ZOOM_NEAR,
  apparentSubjectFrac,
  closeAmountFromDistance,
  defaultSimDistanceM,
  zoomAtDistance,
  zoomCrop,
} from "./zoom";

const D = 1600;
const SCENE_W = 960;
const SCENE_H = 540;
const VIEW_W = 480;
const VIEW_H = 270;

describe("zoom inverse-distance curve", () => {
  it("at 50 m → ZOOM_NEAR (max close-up)", () => {
    assert.ok(Math.abs(zoomAtDistance(50, D) - ZOOM_NEAR) < 1e-9);
    assert.ok(Math.abs(closeAmountFromDistance(50, D) - 1) < 1e-9);
  });

  it("at D → ZOOM_FAR (widest)", () => {
    assert.ok(Math.abs(zoomAtDistance(D, D) - ZOOM_FAR) < 1e-9);
    assert.ok(Math.abs(closeAmountFromDistance(D, D) - 0) < 1e-9);
  });

  it("monotonic: farther → smaller zoom", () => {
    const samples = [50, 100, 200, 400, 800, 1200, 1600];
    for (let i = 1; i < samples.length; i++) {
      const z0 = zoomAtDistance(samples[i - 1], D);
      const z1 = zoomAtDistance(samples[i], D);
      assert.ok(z1 < z0, `zoom(${samples[i]}) should be < zoom(${samples[i - 1]})`);
    }
  });

  it("1/d character: equal inverse steps → equal closeAmount steps", () => {
    // inv: 1/50=0.02, 1/100=0.01, 1/200=0.005 → steps 0.01 and 0.005
    const c50 = closeAmountFromDistance(50, D);
    const c100 = closeAmountFromDistance(100, D);
    const c200 = closeAmountFromDistance(200, D);
    assert.ok(c50 > c100 && c100 > c200);
    const drop1 = c50 - c100; // Δinv = 0.01
    const drop2 = c100 - c200; // Δinv = 0.005
    // drop1 ≈ 2 × drop2 (inverse-distance, not linear in meters)
    assert.ok(
      Math.abs(drop1 / drop2 - 2) < 0.08,
      `expected ~2× drop, got ${drop1 / drop2}`
    );
  });

  it("clamps distance outside [50, D]", () => {
    assert.equal(zoomAtDistance(10, D), zoomAtDistance(50, D));
    assert.equal(zoomAtDistance(99999, D), zoomAtDistance(D, D));
  });
});

describe("zoomCrop — anchor lock (no clamp drift)", () => {
  const anchorX = 0.5;
  const anchorY = 0.78;
  const viewAnchorX = 0.5;
  const viewAnchorY = 0.9;

  it("maps scene anchor exactly to view anchor at any zoom", () => {
    for (const dist of [50, 150, 400, 800, 1600]) {
      const z = zoomAtDistance(dist, D);
      const { scale, ox, oy } = zoomCrop(
        SCENE_W,
        SCENE_H,
        VIEW_W,
        VIEW_H,
        z,
        anchorX,
        anchorY,
        viewAnchorX,
        viewAnchorY
      );
      const ax = SCENE_W * anchorX;
      const ay = SCENE_H * anchorY;
      const vx = ax * scale + ox;
      const vy = ay * scale + oy;
      assert.ok(
        Math.abs(vx - VIEW_W * viewAnchorX) < 1e-6,
        `x drift at ${dist}m: ${vx}`
      );
      assert.ok(
        Math.abs(vy - VIEW_H * viewAnchorY) < 1e-6,
        `y drift at ${dist}m: ${vy}`
      );
    }
  });

  it("higher zoom → larger scale", () => {
    const a = zoomCrop(
      SCENE_W,
      SCENE_H,
      VIEW_W,
      VIEW_H,
      ZOOM_NEAR,
      0.5,
      0.78,
      0.5,
      0.9
    );
    const b = zoomCrop(
      SCENE_W,
      SCENE_H,
      VIEW_W,
      VIEW_H,
      ZOOM_FAR,
      0.5,
      0.78,
      0.5,
      0.9
    );
    assert.ok(a.scale > b.scale);
  });

  it("full deer height fits at near zoom (subject ~28% of scene)", () => {
    // Deer hooves→antlers ≈ 0.30 of scene height in bake
    const subjectSceneFrac = 0.3;
    const app = apparentSubjectFrac(subjectSceneFrac, ZOOM_NEAR);
    // Must be < 0.92 of view (leave margin) with feet at 0.9 of view
    // Space above feet in view = 0.9; subject grows upward from feet
    assert.ok(
      app < 0.88,
      `subject too tall at near zoom: ${app} of view — will clip`
    );
    assert.ok(app > 0.35, `subject too small at near: ${app}`);
  });
});

describe("defaultSimDistanceM — deer a bit farther by default", () => {
  it("starts mid-far, not close-up", () => {
    const d = defaultSimDistanceM(1600);
    assert.ok(d >= 700, `default too close: ${d}`);
    assert.ok(d <= 1600);
    assert.ok(d > DIST_MIN_M * 3);
  });

  it("scales with D", () => {
    assert.ok(defaultSimDistanceM(2350) > defaultSimDistanceM(1050));
  });
});
