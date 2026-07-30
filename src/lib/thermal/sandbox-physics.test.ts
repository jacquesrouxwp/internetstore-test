import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INPUT_LIMITS,
  calibrationRs75DetectM,
  clampSandboxInputs,
  computeDri,
  computeSandbox,
  fovHorizontalDeg,
  ifovMrad,
  johnsonRangeM,
  pixelsOnTargetOptics,
  sensorWidthMm,
  statusFromPixels,
} from "./sandbox-physics";

describe("sensor geometry", () => {
  it("sensor width mm = pitch_µm × N / 1000", () => {
    assert.equal(sensorWidthMm(640, 12), (12 * 640) / 1000);
    assert.ok(Math.abs(sensorWidthMm(1280, 12) - 15.36) < 1e-9);
  });

  it("IFOV mrad = pitch / f", () => {
    assert.equal(ifovMrad(12, 75), 12 / 75);
  });

  it("FOV is positive and shrinks with longer lens", () => {
    const short = fovHorizontalDeg(640, 12, 25);
    const long = fovHorizontalDeg(640, 12, 75);
    assert.ok(short > long);
    assert.ok(short > 5 && short < 40);
  });
});

describe("Johnson DRI + K calibration (RS75-class)", () => {
  it("raw pixels on target formula", () => {
    // 1m target, 50mm, 12µm, 100m
    // px = 1 * 50 / (0.012 * 100) = 41.667
    assert.ok(
      Math.abs(pixelsOnTargetOptics(1, 50, 12, 100) - 50 / 1.2) < 1e-6
    );
  });

  it("D_det with K=1.66 ≈ 3900 m for RS75 human", () => {
    const d = calibrationRs75DetectM(1.66);
    assert.ok(Math.abs(d - 3900) < 30, `got ${d}`);
  });

  it("D_rec / D_id scale as 2:8:13 inverses", () => {
    const dri = computeDri(0.75, 75, 12, 1.66);
    assert.ok(Math.abs(dri.detectM / dri.recognizeM - 8 / 2) < 0.01);
    assert.ok(Math.abs(dri.detectM / dri.identifyM - 13 / 2) < 0.01);
  });

  it("default K is within documented calibration", () => {
    assert.equal(INPUT_LIMITS.kDefault, 1.66);
    const d = calibrationRs75DetectM(INPUT_LIMITS.kDefault);
    assert.ok(d > 3800 && d < 4000);
  });
});

describe("statusFromPixels", () => {
  it("bands 13 / 8 / 2", () => {
    assert.equal(statusFromPixels(20, false), "identify");
    assert.equal(statusFromPixels(10, false), "recognize");
    assert.equal(statusFromPixels(3, false), "detect");
    assert.equal(statusFromPixels(1, false), "none");
  });

  it("fog reduces", () => {
    assert.equal(statusFromPixels(10, true), "detect"); // 6
  });
});

describe("clampSandboxInputs", () => {
  it("clamps absurd values", () => {
    const i = clampSandboxInputs({
      matrixW: 640,
      netdMk: 999,
      focalMm: 5,
      distanceM: 1,
      kCalib: 99,
    });
    assert.equal(i.netdMk, 60);
    assert.equal(i.focalMm, 13);
    assert.ok(i.distanceM >= 50);
    assert.equal(i.kCalib, 2);
  });
});

describe("computeSandbox live", () => {
  it("returns FOV, IFOV, DRI, status", () => {
    const c = computeSandbox({
      matrixW: 640,
      matrixH: 512,
      pitchUm: 12,
      netdMk: 25,
      focalMm: 35,
      target: "deer",
      distanceM: 200,
      fog: false,
      kCalib: 1.66,
    });
    assert.ok(c.fovDeg > 0);
    assert.ok(c.ifovMrad > 0);
    assert.ok(c.dri.detectM > c.dri.recognizeM);
    assert.ok(c.pixelsOnTarget > 0);
  });

  it("flags atypical ultra-long configs", () => {
    const c = computeSandbox({
      matrixW: 1280,
      matrixH: 1024,
      pitchUm: 8,
      netdMk: 15,
      focalMm: 100,
      target: "human",
      distanceM: 500,
      fog: false,
      kCalib: 1.66,
    });
    assert.ok(c.dri.detectM > 3500);
    assert.equal(c.atypical, true);
  });
});

describe("johnsonRangeM unit check", () => {
  it("increases with focal length", () => {
    const a = johnsonRangeM(1, 25, 12, 2, 1);
    const b = johnsonRangeM(1, 50, 12, 2, 1);
    assert.ok(b > a * 1.9);
  });
});
