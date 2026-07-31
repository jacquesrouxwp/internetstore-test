import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEER_FRAC_AT_MIN,
  FEET_FRAC_AT_MIN,
  HORIZON_FRAC,
  REF_VISUAL_H_M,
  SUBJECT_FRAC_MAX,
  deerFeetYFrac,
  deerHeightFrac,
  deerScreenRect,
  defaultSimDistanceM,
  digitalZoomCrop,
  inspectDigiZoom,
  subjectHeightFrac,
} from "./zoom";

describe("subjectHeightFrac — FOV angular size", () => {
  it("at 50 m all targets under 34% of frame (no face-fill)", () => {
    for (const H of [0.4, 1.0, 1.3, 1.8]) {
      const f = subjectHeightFrac(H, 50);
      assert.ok(f <= SUBJECT_FRAC_MAX + 1e-9, `H=${H}m too big: ${f}`);
      assert.ok(f > 0.02, `H=${H}m too small: ${f}`);
    }
  });

  it("human is taller than deer, deer taller than fox (same d)", () => {
    const human = subjectHeightFrac(1.8, 50);
    const deer = subjectHeightFrac(1.3, 50);
    const fox = subjectHeightFrac(0.4, 50);
    assert.ok(human > deer && deer > fox);
    // Human must NOT be ~1.4× a 50% deer (old bug ≈ 70%+)
    assert.ok(human < 0.35, `human still huge: ${human}`);
  });

  it("∝ 1/d — 100 m is half of 50 m", () => {
    const a = subjectHeightFrac(1.3, 50);
    const b = subjectHeightFrac(1.3, 100);
    assert.ok(Math.abs(b / a - 0.5) < 0.02, `ratio ${b / a}`);
  });

  it("deerHeightFrac matches REF deer height", () => {
    assert.ok(
      Math.abs(deerHeightFrac(50) - subjectHeightFrac(REF_VISUAL_H_M, 50)) <
        1e-9
    );
    assert.ok(Math.abs(deerHeightFrac(50) - DEER_FRAC_AT_MIN) < 1e-9);
  });
});

describe("deerFeetYFrac — shared ground point for all characters", () => {
  it("at 50 m feet on foreground litter", () => {
    assert.ok(Math.abs(deerFeetYFrac(50) - FEET_FRAC_AT_MIN) < 1e-9);
  });

  it("at 1000 m feet still on ground band (below canopy)", () => {
    const y = deerFeetYFrac(1000);
    assert.ok(y >= HORIZON_FRAC, `above horizon: ${y}`);
    assert.ok(y < FEET_FRAC_AT_MIN);
    assert.ok(y > 0.7, `too high in frame (trunk zone): ${y}`);
  });

  it("size and ground offset share the same 1/d law", () => {
    const rH = deerHeightFrac(400) / deerHeightFrac(100);
    const rG =
      (deerFeetYFrac(400) - HORIZON_FRAC) / (deerFeetYFrac(100) - HORIZON_FRAC);
    assert.ok(Math.abs(rH - rG) < 0.05, `desync ${rH} vs ${rG}`);
  });
});

describe("deerScreenRect — same feet for any height", () => {
  it("plants feet on ground row for deer and human", () => {
    const feet = deerFeetYFrac(200) * 270;
    const deer = deerScreenRect(
      200,
      480,
      270,
      0.85,
      50,
      0,
      subjectHeightFrac(1.3, 200)
    );
    const human = deerScreenRect(
      200,
      480,
      270,
      0.45,
      50,
      0,
      subjectHeightFrac(1.8, 200)
    );
    assert.ok(Math.abs(deer.feetY - feet) < 1e-6);
    assert.ok(Math.abs(human.feetY - feet) < 1e-6);
    // Same contact point — only height differs
    assert.ok(Math.abs(deer.feetY - human.feetY) < 1e-6);
    assert.ok(human.h > deer.h);
  });

  it("full subject in frame at 50 m (no top explode)", () => {
    for (const H of [0.4, 1.3, 1.8]) {
      const r = deerScreenRect(
        50,
        480,
        270,
        0.5,
        50,
        0,
        subjectHeightFrac(H, 50)
      );
      assert.ok(r.y >= -2, `clipped top H=${H} y=${r.y}`);
      assert.ok(r.h / 270 <= SUBJECT_FRAC_MAX + 0.02);
    }
  });

  it("at 1000 m subject is a few pixels tall", () => {
    const r = deerScreenRect(
      1000,
      480,
      270,
      0.85,
      50,
      0,
      subjectHeightFrac(1.3, 1000)
    );
    assert.ok(r.h < 20, `too tall at 1000m: ${r.h}px`);
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

describe("inspectDigiZoom — make far detection visible", () => {
  it("at 50 m stays low (no need for ×16)", () => {
    assert.ok(inspectDigiZoom(50) <= 4);
  });

  it("at 2300 m uses ×32 so hot mark is inspectable", () => {
    assert.equal(inspectDigiZoom(2300), 32);
  });

  it("at 1000 m at least ×8", () => {
    assert.ok(inspectDigiZoom(1000) >= 8);
  });

  it("tiny FOV frac at range → ×32", () => {
    assert.equal(inspectDigiZoom(2000, 50, 0.008), 32);
  });
});

describe("defaultSimDistanceM", () => {
  it("mid-near so recession is already visible", () => {
    const d = defaultSimDistanceM(1600);
    assert.ok(d >= 180 && d <= 320);
    assert.ok(deerHeightFrac(d) < deerHeightFrac(50) * 0.45);
  });
});
