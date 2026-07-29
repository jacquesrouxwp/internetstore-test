import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIST_MIN_M,
  ZOOM_FAR,
  ZOOM_NEAR,
  closeAmountFromDistance,
  defaultSimDistanceM,
  digitalZoomCrop,
  zoomAtDistance,
  zoomCrop,
} from "./zoom";

const D = 1600;
const SCENE_W = 960;
const SCENE_H = 540;
const VIEW_W = 480;
const VIEW_H = 270;

describe("zoom inverse-distance curve (whole-scene optical zoom)", () => {
  it("at 50 m → ZOOM_NEAR", () => {
    assert.ok(Math.abs(zoomAtDistance(50, D) - ZOOM_NEAR) < 1e-9);
    assert.ok(Math.abs(closeAmountFromDistance(50, D) - 1) < 1e-9);
  });

  it("at D → ZOOM_FAR", () => {
    assert.ok(Math.abs(zoomAtDistance(D, D) - ZOOM_FAR) < 1e-9);
    assert.ok(Math.abs(closeAmountFromDistance(D, D) - 0) < 1e-9);
  });

  it("monotonic: farther → smaller zoom", () => {
    for (const [a, b] of [
      [50, 100],
      [100, 400],
      [400, 800],
      [800, 1600],
    ] as const) {
      assert.ok(zoomAtDistance(b, D) < zoomAtDistance(a, D));
    }
  });
});

describe("zoomCrop — static deer anchor (no float)", () => {
  const anchorX = 0.5;
  const anchorY = 0.78;
  const viewAnchorX = 0.5;
  const viewAnchorY = 0.9;

  it("scene anchor maps exactly to view anchor at every distance", () => {
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
      assert.ok(Math.abs(vx - VIEW_W * viewAnchorX) < 1e-6, `x drift @${dist}`);
      assert.ok(Math.abs(vy - VIEW_H * viewAnchorY) < 1e-6, `y drift @${dist}`);
    }
  });

  it("higher zoom → larger scale (whole picture grows together)", () => {
    const near = zoomCrop(
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
    const far = zoomCrop(
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
    assert.ok(near.scale > far.scale);
  });
});

describe("digitalZoomCrop", () => {
  it("×1 full sensor", () => {
    assert.deepEqual(digitalZoomCrop(240, 135, 1, 0.5, 0.5), {
      sx: 0,
      sy: 0,
      sw: 240,
      sh: 135,
    });
  });

  it("×2 quarter area", () => {
    const c = digitalZoomCrop(240, 135, 2, 0.5, 0.5);
    assert.equal(c.sw, 120);
    assert.equal(c.sh, 67.5);
  });
});

describe("defaultSimDistanceM", () => {
  it("starts mid-far so deer is not a hero close-up", () => {
    const d = defaultSimDistanceM(1600);
    assert.ok(d >= 700, `too close: ${d}`);
    assert.ok(d <= 1600);
    assert.ok(d > DIST_MIN_M * 3);
  });
});
