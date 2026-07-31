/**
 * Perspective model: fixed-FOV forest + subject that recedes with distance.
 *
 *   apparent height ≈ (visualHeight / d) / FOV_vert   (real angular size)
 *   feet on ground plane                              (same 1/d law)
 *
 * All targets (deer/boar/fox/human) share the same feet contact row at a given
 * distance — only height scales with body size. Ground band is calibrated to
 * forest litter (not mid-trunk).
 */

export const DIST_MIN_M = 50;

/**
 * Vertical FOV used for on-screen size (typical thermal monocular ~10–12°).
 * Not the product lens — a shared sim FOV so size ratios stay honest.
 */
export const SIM_FOV_VERT_DEG = 11;

/** Reference animal for legacy deerHeightFrac (m). */
export const REF_VISUAL_H_M = 1.3;

/**
 * Mild display boost so targets stay readable in a sales sim without
 * filling the frame (pure FOV at 50 m would be only ~13% for a deer).
 */
export const DISPLAY_SIZE_BOOST = 1.5;

/** Hard cap: no subject may exceed this fraction of frame height. */
export const SUBJECT_FRAC_MAX = 0.34;
/** Floor so a far target stays a faint hot mark. */
export const SUBJECT_FRAC_MIN = 0.005;

/**
 * Far ground line in the forest plate (tree bases on the litter).
 * MUST stay in the soil band (~0.70–0.78) — not mid-trunk.
 */
export const HORIZON_FRAC = 0.73;
/** Feet on foreground litter at 50 m — same for ALL characters. */
export const FEET_FRAC_AT_MIN = 0.91;
export const DEER_CENTER_X = 0.5;

// ─── Backward-compat aliases (tests / older call sites) ───────────────────
/** @deprecated use subjectHeightFrac(REF_VISUAL_H_M, d) */
export const DEER_FRAC_AT_MIN = subjectHeightFrac(REF_VISUAL_H_M, DIST_MIN_M);
export const DEER_FRAC_MAX = SUBJECT_FRAC_MAX;
export const DEER_FRAC_MIN = SUBJECT_FRAC_MIN;

/**
 * Apparent height as a fraction of frame height.
 * Angular size ∝ H / d / FOV — same feet position for every target at distance d.
 */
export function subjectHeightFrac(
  visualHeightM: number,
  distanceM: number,
  dMin: number = DIST_MIN_M,
  fovVertDeg: number = SIM_FOV_VERT_DEG
): number {
  const d = Math.max(dMin, distanceM);
  const H = Math.max(0.05, visualHeightM);
  const fovRad = (Math.max(4, fovVertDeg) * Math.PI) / 180;
  // small-angle: frame_frac = (H / d) / FOV
  const frac = ((H / d) / fovRad) * DISPLAY_SIZE_BOOST;
  return Math.max(SUBJECT_FRAC_MIN, Math.min(SUBJECT_FRAC_MAX, frac));
}

/** Deer reference height (legacy name). */
export function deerHeightFrac(
  distanceM: number,
  dMin: number = DIST_MIN_M
): number {
  return subjectHeightFrac(REF_VISUAL_H_M, distanceM, dMin);
}

/**
 * Feet row on the ground plane: rises toward horizon as d grows.
 * (feet − horizon) ∝ 1/d  → same law as height → no float.
 * Shared by deer / boar / fox / human — one starting contact point.
 */
export function deerFeetYFrac(
  distanceM: number,
  dMin: number = DIST_MIN_M
): number {
  const d = Math.max(dMin, distanceM);
  const span = FEET_FRAC_AT_MIN - HORIZON_FRAC;
  const y = HORIZON_FRAC + span * (dMin / d);
  return Math.min(FEET_FRAC_AT_MIN, Math.max(HORIZON_FRAC + 0.01, y));
}

export function atmosphericTransmission(
  distanceM: number,
  detectionRangeM: number,
  fog: boolean
): number {
  const D = Math.max(200, detectionRangeM);
  const t = Math.max(0, Math.min(1, distanceM / D));
  const clearFloor = 0.38;
  const base = 1 - (1 - clearFloor) * Math.pow(t, 0.9);
  return fog ? base * 0.7 : base;
}

export function deerScreenRect(
  distanceM: number,
  frameW: number,
  frameH: number,
  spriteAspect: number,
  dMin: number = DIST_MIN_M,
  feetSinkPx: number = 0,
  /**
   * Optional height fraction (0–1 of frame). When set, overrides
   * deer reference size (use subjectHeightFrac for multi-target).
   */
  heightFracOverride?: number
): {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  feetY: number;
} {
  const frac =
    heightFracOverride != null && Number.isFinite(heightFracOverride)
      ? Math.max(
          SUBJECT_FRAC_MIN,
          Math.min(SUBJECT_FRAC_MAX, heightFracOverride)
        )
      : deerHeightFrac(distanceM, dMin);
  const h = Math.max(1, frac * frameH);
  const w = Math.max(1, h * Math.max(0.15, spriteAspect));
  // Shared ground contact — identical for every character at this distance
  const feetY = deerFeetYFrac(distanceM, dMin) * frameH + feetSinkPx;
  const cx = DEER_CENTER_X * frameW;
  const x = cx - w / 2;
  // Plant feet on the ground row; if head would clip top, shrink was already capped
  let y = feetY - h;
  if (y < 0) {
    // Prefer keeping feet planted over clipping antlers/head
    y = 0;
  }
  return { x, y, w, h: Math.min(h, feetY - y), cx, cy: y + h * 0.45, feetY };
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

export const DIGI_ZOOM_STEPS = [1, 2, 4, 8, 16, 32] as const;
export type DigiZoomStep = (typeof DIGI_ZOOM_STEPS)[number];

/**
 * Pick digi zoom so target ~35–50% of frame after magnify.
 */
export function inspectDigiZoom(
  distanceM: number,
  dMin: number = DIST_MIN_M,
  frameHeightFrac?: number
): DigiZoomStep {
  const frac =
    frameHeightFrac != null && Number.isFinite(frameHeightFrac)
      ? Math.max(0.003, frameHeightFrac)
      : deerHeightFrac(distanceM, dMin);
  const needed = 0.4 / Math.max(frac, 0.003);
  let best: DigiZoomStep = 1;
  for (const z of DIGI_ZOOM_STEPS) {
    if (z <= needed + 0.2) best = z;
  }
  if (distanceM >= 600 && best < 8) best = 8;
  if (distanceM >= 1000 && best < 16) best = 16;
  if (distanceM >= 1600 && best < 32) best = 32;
  return best;
}

export function nextDigiZoom(current: number, dir: 1 | -1): DigiZoomStep {
  const idx = DIGI_ZOOM_STEPS.findIndex((z) => z === current);
  const i = idx < 0 ? 0 : idx;
  const n = Math.max(0, Math.min(DIGI_ZOOM_STEPS.length - 1, i + dir));
  return DIGI_ZOOM_STEPS[n];
}

/** Default mid-near range — recession already visible, not a face-fill. */
export function defaultSimDistanceM(detectionRangeM: number): number {
  const D = Math.max(300, detectionRangeM || 1200);
  return Math.max(200, Math.min(300, Math.round(D * 0.15)));
}
