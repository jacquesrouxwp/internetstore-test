/**
 * Perspective model: fixed-FOV forest + deer that REALLY recedes with distance.
 *
 *   apparent height ∝ 1/d     (at 1000 m ≈ 1/20 of size at 50 m)
 *   feet on ground plane      (same 1/d law → size & position move together)
 *
 * Ground band is calibrated to forest_whitehot litter (not mid-trunk).
 */

export const DIST_MIN_M = 50;

/** Deer height / frame height at 50 m (readable close-up, still on clearing). */
export const DEER_FRAC_AT_MIN = 0.52;
export const DEER_FRAC_MAX = 0.58;
/** At 1000+ m still a faint hot mark, not zero. */
export const DEER_FRAC_MIN = 0.006;

/**
 * Far ground line in the forest plate (tree bases on the litter).
 * MUST stay in the soil band (~0.70–0.78 after cover) — not 0.6 mid-trunk.
 */
export const HORIZON_FRAC = 0.73;
/** Feet on foreground litter at 50 m. */
export const FEET_FRAC_AT_MIN = 0.91;
export const DEER_CENTER_X = 0.5;

/** Apparent height fraction: DEER_FRAC_AT_MIN × (50 / d). */
export function deerHeightFrac(distanceM: number, dMin: number = DIST_MIN_M): number {
  const d = Math.max(dMin, distanceM);
  const frac = DEER_FRAC_AT_MIN * (dMin / d);
  return Math.max(DEER_FRAC_MIN, Math.min(DEER_FRAC_MAX, frac));
}

/**
 * Feet row on the ground plane: rises toward horizon as d grows.
 * (feet − horizon) ∝ 1/d  → same law as height → no float.
 */
export function deerFeetYFrac(distanceM: number, dMin: number = DIST_MIN_M): number {
  const d = Math.max(dMin, distanceM);
  const span = FEET_FRAC_AT_MIN - HORIZON_FRAC;
  const y = HORIZON_FRAC + span * (dMin / d);
  // Soft clamp into ground band only (never above horizon soil line)
  return Math.min(FEET_FRAC_AT_MIN, Math.max(HORIZON_FRAC + 0.01, y));
}

export function atmosphericTransmission(
  distanceM: number,
  detectionRangeM: number,
  fog: boolean
): number {
  const D = Math.max(200, detectionRangeM);
  const t = Math.max(0, Math.min(1, distanceM / D));
  // Stronger wash at range so far deer "melts" into noise (honest at 1000 m)
  const clearFloor = 0.22;
  const base = 1 - (1 - clearFloor) * Math.pow(t, 0.85);
  return fog ? base * 0.65 : base;
}

export function deerScreenRect(
  distanceM: number,
  frameW: number,
  frameH: number,
  spriteAspect: number,
  dMin: number = DIST_MIN_M,
  feetSinkPx: number = 0
): {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  feetY: number;
} {
  const h = deerHeightFrac(distanceM, dMin) * frameH;
  const w = Math.max(1, h * spriteAspect);
  const feetY = deerFeetYFrac(distanceM, dMin) * frameH + feetSinkPx;
  const cx = DEER_CENTER_X * frameW;
  const x = cx - w / 2;
  const y = feetY - h;
  return { x, y, w, h, cx, cy: y + h * 0.45, feetY };
}

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

/** Allowed digital zoom steps (magnify sensor blocks — no new detail). */
export const DIGI_ZOOM_STEPS = [1, 2, 4, 8, 16] as const;
export type DigiZoomStep = (typeof DIGI_ZOOM_STEPS)[number];

/**
 * Pick a digital zoom so the deer is ~40–55% of frame height after magnify.
 * At 2300 m the animal is ~1–3 px — ×16 makes a clear hot blob ("detection works").
 */
export function inspectDigiZoom(
  distanceM: number,
  dMin: number = DIST_MIN_M
): DigiZoomStep {
  const frac = deerHeightFrac(distanceM, dMin);
  // target apparent fraction after zoom ≈ 0.42
  const needed = 0.42 / Math.max(frac, 0.004);
  let best: DigiZoomStep = 1;
  for (const z of DIGI_ZOOM_STEPS) {
    if (z <= needed + 0.15) best = z;
  }
  // At long range always offer at least ×8 so "Виявлення" is obvious
  if (distanceM >= 800 && best < 8) best = 8;
  if (distanceM >= 1500 && best < 16) best = 16;
  return best;
}

export function nextDigiZoom(current: number, dir: 1 | -1): DigiZoomStep {
  const idx = DIGI_ZOOM_STEPS.findIndex((z) => z === current);
  const i = idx < 0 ? 0 : idx;
  const n = Math.max(0, Math.min(DIGI_ZOOM_STEPS.length - 1, i + dir));
  return DIGI_ZOOM_STEPS[n];
}

/** Default ~200–250 m — deer clearly smaller than 50 m, still identifiable. */
export function defaultSimDistanceM(detectionRangeM: number): number {
  const D = Math.max(300, detectionRangeM || 1200);
  return Math.max(180, Math.min(280, Math.round(D * 0.14)));
}
