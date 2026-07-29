/**
 * Optical zoom math for thermal scene simulator.
 * Angular size of target ∝ 1/distance → zoom curve follows inverse distance.
 */

export const DIST_MIN_M = 50;

/** Zoom mult at DIST_MIN_M (close-up). Full deer must still fit in 16:9. */
export const ZOOM_NEAR = 1.55;

/** Zoom mult at max range (wide). 1 = cover full scene buffer. */
export const ZOOM_FAR = 1.0;

/**
 * Normalized closeness in [0,1]: 1 = nearest (50 m), 0 = farthest (dMax).
 * Uses inverse-distance so equal steps in meters feel natural optically.
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
 * Source crop in scene pixels for a view of size (vw, vh),
 * mapping scene anchor → view anchor. No clamping (caller draws with transform).
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
  // view = scene * scale + offset  →  offset = viewAnchor - sceneAnchor * scale
  return {
    scale,
    ox: vx - ax * scale,
    oy: vy - ay * scale,
  };
}

/** Apparent subject height in view as fraction of viewH (scene subjectHeightFrac of scene). */
export function apparentSubjectFrac(
  sceneSubjectHeightFrac: number,
  zoom: number
): number {
  // At zoom=1 with cover of equal aspect, subjectFrac_view ≈ sceneSubjectHeightFrac
  // Higher zoom multiplies apparent size
  return sceneSubjectHeightFrac * zoom;
}

/**
 * Default slider distance: deer reads a bit farther (not close-up).
 * ~55% of D, clamped to a sensible mid range.
 */
export function defaultSimDistanceM(detectionRangeM: number): number {
  const D = Math.max(300, detectionRangeM || 1200);
  const mid = Math.round(D * 0.55);
  return Math.min(D, Math.max(DIST_MIN_M + 50, mid));
}
