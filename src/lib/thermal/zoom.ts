/**
 * Optics + ground-plane perspective for the thermal scene simulator.
 *
 * The device has a FIXED field of view (the forest background never changes).
 * A deer at distance `d` is a real sprite composited onto the ground plane:
 *
 *   • Apparent height  ∝ 1/d   — angular size of a real object (honest optics).
 *   • Feet contact row ∝ 1/d   — projection of a ground point onto the image.
 *
 * Because BOTH follow the same 1/d law, size and position move together, so the
 * deer smoothly walks away toward the horizon with no "floating cutout" jump.
 *
 * Detection STATUS (Johnson) and pixelation/noise live in parse-product-thermal;
 * they are what differ between devices at the same angular target.
 */

/** Nearest simulated distance (m). */
export const DIST_MIN_M = 50;

/** Deer height as a fraction of frame height at DIST_MIN_M (hero close-up). */
export const DEER_FRAC_AT_MIN = 0.72;
/** Never let the sprite grow past this (antlers must stay in frame). */
export const DEER_FRAC_MAX = 0.82;
/** Floor so a far deer stays a faint hot mark until noise/pixelation eat it. */
export const DEER_FRAC_MIN = 0.008;

/** Image row (fraction) where the distant ground meets the tree line. */
export const HORIZON_FRAC = 0.6;
/** Image row (fraction) of the deer's feet at DIST_MIN_M (stands low, near). */
export const FEET_FRAC_AT_MIN = 0.9;
/** Horizontal placement of the deer (clearing is centered). */
export const DEER_CENTER_X = 0.5;

/**
 * Apparent deer height as a fraction of frame height at `distanceM`.
 * Angular size ∝ 1/d, anchored so DIST_MIN_M → DEER_FRAC_AT_MIN.
 */
export function deerHeightFrac(distanceM: number, dMin: number = DIST_MIN_M): number {
  const d = Math.max(dMin, distanceM);
  const frac = DEER_FRAC_AT_MIN * (dMin / d);
  return Math.max(DEER_FRAC_MIN, Math.min(DEER_FRAC_MAX, frac));
}

/**
 * Image row (fraction of height) of the deer's feet at `distanceM`.
 * Ground-plane projection: (row − horizon) ∝ 1/d. Rises to the horizon far away.
 */
export function deerFeetYFrac(distanceM: number, dMin: number = DIST_MIN_M): number {
  const d = Math.max(dMin, distanceM);
  const k = (FEET_FRAC_AT_MIN - HORIZON_FRAC) * dMin;
  return HORIZON_FRAC + k / d;
}

/**
 * Atmospheric transmission of thermal contrast [0..1]: 1 near, → low as d → D.
 * Distant targets wash toward the background temperature (haze / path radiance).
 */
export function atmosphericTransmission(
  distanceM: number,
  detectionRangeM: number,
  fog: boolean
): number {
  const D = Math.max(200, detectionRangeM);
  const t = Math.max(0, Math.min(1, distanceM / D));
  const clearFloor = 0.35;
  const base = 1 - (1 - clearFloor) * t; // linear falloff to clearFloor at D
  return fog ? base * 0.7 : base;
}

/**
 * Pixel geometry of the deer sprite for a given frame + sprite content aspect.
 * `spriteAspect` = contentWidth / contentHeight of the trimmed sprite.
 */
export function deerScreenRect(
  distanceM: number,
  frameW: number,
  frameH: number,
  spriteAspect: number,
  dMin: number = DIST_MIN_M
): { x: number; y: number; w: number; h: number; cx: number; cy: number } {
  const h = deerHeightFrac(distanceM, dMin) * frameH;
  const w = h * spriteAspect;
  const feetY = deerFeetYFrac(distanceM, dMin) * frameH;
  const cx = DEER_CENTER_X * frameW;
  const x = cx - w / 2;
  const y = feetY - h;
  return { x, y, w, h, cx, cy: y + h / 2 };
}

/**
 * Digital-zoom crop rectangle (in sensor pixels) centered on a focus point.
 * Magnifying a sensor image crops + upscales it — no new detail, more blockiness.
 * `zoom` ≥ 1. Focus is clamped so the crop stays inside the sensor.
 */
export function digitalZoomCrop(
  sensorW: number,
  sensorH: number,
  zoom: number,
  focusXFrac: number,
  focusYFrac: number
): { sx: number; sy: number; sw: number; sh: number } {
  const z = Math.max(1, zoom);
  const sw = sensorW / z;
  const sh = sensorH / z;
  const fx = focusXFrac * sensorW;
  const fy = focusYFrac * sensorH;
  let sx = fx - sw / 2;
  let sy = fy - sh / 2;
  sx = Math.max(0, Math.min(sensorW - sw, sx));
  sy = Math.max(0, Math.min(sensorH - sh, sy));
  return { sx, sy, sw, sh };
}

/**
 * Default slider distance: a clear, huntable mid-near range (~200 m) so the
 * first impression shows a well-defined deer, with room to push it away.
 */
export function defaultSimDistanceM(detectionRangeM: number): number {
  const D = Math.max(300, detectionRangeM || 1200);
  return Math.max(140, Math.min(220, Math.round(D * 0.12)));
}
