/**
 * Optical zoom of a SINGLE baked scene (forest + deer already planted).
 * Deer never moves relative to trees/ground — the whole frame scales around
 * the hoof-ground anchor. Distance slider = camera zoom (1/d curve).
 */

/** Nearest simulated distance (m) — max optical zoom-in. */
export const DIST_MIN_M = 50;

/** Zoom mult at DIST_MIN_M (close-up). Full deer must stay in frame. */
export const ZOOM_NEAR = 1.85;

/** Zoom mult at max range (wide / cover full scene). */
export const ZOOM_FAR = 1.0;

/**
 * Normalized closeness [0..1]: 1 = nearest (50 m), 0 = farthest (dMax).
 * Inverse-distance so optics feel natural.
 */
export function closeAmountFromDistance(
  distanceM: number,
  dMax: number,
  dMin: number = DIST_MIN_M
): number {
  const d = Math.max(dMin, Math.min(dMax, distanceM));
  const inv = 1 / d;
  const invNear = 1 / dMin;
  const invFar = 1 / Math.max(dMax, dMin + 1);
  if (invNear <= invFar) return 0;
  return (inv - invFar) / (invNear - invFar);
}

/** Optical zoom multiplier at distance (ZOOM_NEAR … ZOOM_FAR). */
export function zoomAtDistance(
  distanceM: number,
  dMax: number,
  dMin: number = DIST_MIN_M
): number {
  const c = closeAmountFromDistance(distanceM, dMax, dMin);
  return ZOOM_FAR + c * (ZOOM_NEAR - ZOOM_FAR);
}

/**
 * Transform: map scene anchor → view anchor (no clamp → no deer drift).
 * view = scene * scale + offset
 */
export function zoomCrop(
  sceneW: number,
  sceneH: number,
  viewW: number,
  viewH: number,
  zoom: number,
  anchorX: number,
  anchorY: number,
  viewAnchorX: number,
  viewAnchorY: number
): { scale: number; ox: number; oy: number } {
  const cover = Math.max(viewW / sceneW, viewH / sceneH);
  const scale = cover * zoom;
  const ax = sceneW * anchorX;
  const ay = sceneH * anchorY;
  const vx = viewW * viewAnchorX;
  const vy = viewH * viewAnchorY;
  return {
    scale,
    ox: vx - ax * scale,
    oy: vy - ay * scale,
  };
}

/**
 * Digital-zoom crop (sensor pixels) centered on focus — magnifies blocks, no new detail.
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
 * Default slider: deer reads a bit farther (~55% of D), not a 50 m close-up.
 */
export function defaultSimDistanceM(detectionRangeM: number): number {
  const D = Math.max(300, detectionRangeM || 1200);
  const mid = Math.round(D * 0.55);
  return Math.min(D, Math.max(DIST_MIN_M + 80, mid));
}

/** Atmospheric wash for contrast at range (noise path). */
export function atmosphericTransmission(
  distanceM: number,
  detectionRangeM: number,
  fog: boolean
): number {
  const D = Math.max(200, detectionRangeM);
  const t = Math.max(0, Math.min(1, distanceM / D));
  const clearFloor = 0.45;
  const base = 1 - (1 - clearFloor) * t;
  return fog ? base * 0.7 : base;
}
