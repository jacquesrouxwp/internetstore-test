/**
 * Optics + ground-plane perspective for the thermal scene simulator.
 *
 * Fixed FOV forest background. Deer sprite on the ground plane:
 *   • Apparent height  ∝ 1/d
 *   • Feet contact row ∝ 1/d  (same law → size & position move together)
 *
 * Constants are calibrated to `forest_whitehot.jpg`: open litter in the lower
 * third, tree bases ~ mid-frame. Wrong horizon → deer "hangs" on trunks.
 */

/** Nearest simulated distance (m). */
export const DIST_MIN_M = 50;

/**
 * Deer height as fraction of frame at DIST_MIN_M.
 * Kept modest so the animal sits in the clearing, not mid-canopy (was 0.72 → float).
 */
export const DEER_FRAC_AT_MIN = 0.48;
/** Hard cap so antlers stay in frame. */
export const DEER_FRAC_MAX = 0.55;
/** Far hot-mark floor. */
export const DEER_FRAC_MIN = 0.008;

/**
 * Image row (0 = top) where the far ground meets tree bases in the forest asset
 * after cover-crop. Calibrated so feet never land on mid-trunk.
 */
export const HORIZON_FRAC = 0.64;
/**
 * Feet row at DIST_MIN_M — deep on the foreground litter (planted, not floating).
 */
export const FEET_FRAC_AT_MIN = 0.92;
/** Horizontal placement (clearing center). */
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
 * Ground-plane projection: (row − horizon) ∝ 1/d.
 * Clamped into the visible ground band so feet never enter the trunk zone.
 */
export function deerFeetYFrac(distanceM: number, dMin: number = DIST_MIN_M): number {
  const d = Math.max(dMin, distanceM);
  const k = (FEET_FRAC_AT_MIN - HORIZON_FRAC) * dMin;
  const y = HORIZON_FRAC + k / d;
  // Stay at least 2% below horizon (on soil) and not below near feet line
  const floor = HORIZON_FRAC + 0.025;
  return Math.min(FEET_FRAC_AT_MIN, Math.max(floor, y));
}

/**
 * Atmospheric transmission of thermal contrast [0..1]: 1 near, → low as d → D.
 */
export function atmosphericTransmission(
  distanceM: number,
  detectionRangeM: number,
  fog: boolean
): number {
  const D = Math.max(200, detectionRangeM);
  const t = Math.max(0, Math.min(1, distanceM / D));
  const clearFloor = 0.35;
  const base = 1 - (1 - clearFloor) * t;
  return fog ? base * 0.7 : base;
}

/**
 * Pixel geometry of the deer sprite for a given frame + sprite content aspect.
 * Feet sit on the ground row; optional sink embeds hooves slightly into soil.
 */
export function deerScreenRect(
  distanceM: number,
  frameW: number,
  frameH: number,
  spriteAspect: number,
  dMin: number = DIST_MIN_M,
  /** Extra pixels to sink feet into the ground (anti-float). */
  feetSinkPx: number = 0
): { x: number; y: number; w: number; h: number; cx: number; cy: number; feetY: number } {
  const h = deerHeightFrac(distanceM, dMin) * frameH;
  const w = h * spriteAspect;
  const feetY = deerFeetYFrac(distanceM, dMin) * frameH + feetSinkPx;
  const cx = DEER_CENTER_X * frameW;
  const x = cx - w / 2;
  const y = feetY - h;
  return { x, y, w, h, cx, cy: y + h / 2, feetY };
}

/**
 * Digital-zoom crop rectangle (sensor pixels) centered on a focus point.
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
 * Default slider: mid-near so deer is clearly on the ground, not a hero fill.
 */
export function defaultSimDistanceM(detectionRangeM: number): number {
  const D = Math.max(300, detectionRangeM || 1200);
  // ~18% of D, clamped 160–280 m — farther than 50 m close-up, still readable
  return Math.max(160, Math.min(280, Math.round(D * 0.18)));
}
