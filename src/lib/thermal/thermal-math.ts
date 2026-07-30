/**
 * Thermal 3D math — single entry for camera FOV, DRI status, grain sizes.
 * Re-exports PDP helpers so the 3D scene stays in lockstep with 2D audits.
 */

import {
  resolveFovVerticalRad,
  type ThermalMatrix,
} from "./parse-product-thermal";
import { detectionRangeForTarget } from "./targets";

export {
  JOHNSON_PX,
  DEFAULT_FOV_VERT_DEG,
  matrixVertPixels,
  matrixPixelWidth,
  matrixPixelHeight,
  resolveFovVerticalRad,
  fovVerticalRadFromOptics,
  pixelsOnTarget,
  effectivePixelsOnTarget,
  computeDetectStatus,
  computeDetectStatusVisual,
  renderTargetHeightFrac,
  targetSubjectVisibility,
  renderedCriticalGrainPx,
  netdNoiseAmp,
  netdContrast,
  parseProductThermal,
  matrixClassPreset,
  defaultDetectionRangeM,
  defaultNetdMk,
  type ThermalSimParams,
  type ThermalMatrix,
  type DetectStatus,
  type ThermalCompareOption,
} from "./parse-product-thermal";

export {
  DIST_MIN_M,
  DIGI_ZOOM_STEPS,
  digitalZoomCrop,
  inspectDigiZoom,
  nextDigiZoom,
  defaultSimDistanceM,
  atmosphericTransmission,
  type DigiZoomStep,
} from "./zoom";

export {
  getThermalTarget,
  detectionRangeForTarget,
  THERMAL_TARGETS,
  type ThermalTargetId,
  type ThermalTargetDef,
} from "./targets";

/** Real standing height of deer target (m) — matches targets.ts visualHeightM */
export const DEER_VISUAL_HEIGHT_M = 1.3;
/** Johnson critical size for deer (m) */
export const DEER_CRITICAL_SIZE_M = 1.0;

/** GLB path (textures stripped → ~47 KB Draco mesh) */
export const DEER_GLB_URL = "/thermal/models/deer.glb";
/** Cold forest backdrop (existing thermal plate) */
export const FOREST_BACKDROP_URL = "/thermal/forest_whitehot.jpg";

/**
 * PerspectiveCamera.fov in three.js is **vertical** FOV in **degrees**.
 */
export function cameraFovVerticalDeg(params: {
  matrix: ThermalMatrix;
  focalMm?: number | null;
  pitchUm?: number | null;
}): number {
  return (resolveFovVerticalRad(params) * 180) / Math.PI;
}

export function fovVerticalDegFromRad(fovVertRad: number): number {
  return (fovVertRad * 180) / Math.PI;
}

/**
 * Apparent frame-height fraction of a body of height H at distance d
 * under vertical FOV (rad).
 */
export function angularFrameHeightFrac(
  visualHeightM: number,
  distanceM: number,
  fovVertRad: number
): number {
  const d = Math.max(1, distanceM);
  const h = Math.max(0.05, visualHeightM);
  const fov = Math.max(1e-6, fovVertRad);
  return Math.max(0.004, Math.min(0.55, h / d / fov));
}

/** Passport D scaled to deer critical size (human 0.75 m baseline). */
export function deerDetectionRangeM(passportDetectionHumanM: number): number {
  return detectionRangeForTarget(
    passportDetectionHumanM,
    DEER_CRITICAL_SIZE_M,
    0.75
  );
}

/** Camera eye height (m) — hunter holding monocular, looking roughly level. */
export const CAMERA_EYE_HEIGHT_M = 1.55;

/** Seeded mulberry32 — same family as 2D simulator */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: (string | number | boolean)[]): number {
  const s = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
