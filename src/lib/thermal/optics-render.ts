/**
 * Optics-driven IMAGE FORMATION for the sandbox simulator.
 *
 * The sandbox shows a FIXED angular window (so the subject keeps its
 * distance-driven on-screen size and A/B comparisons stay fair). What the
 * optics actually change is therefore not the framing — it is how much real
 * detail the device can put inside that window:
 *
 *   IFOV = pitch_µm / f_mm            (mrad — angle seen by ONE detector)
 *   rows = FOV_window / IFOV          (detector rows spanning the window)
 *
 * so a longer lens or a finer pitch ⇒ smaller IFOV ⇒ MORE detector rows across
 * the same view ⇒ a finer sampling grid ⇒ visibly sharper picture. Distance
 * never changes IFOV, but the target shrinks inside the window, so fewer
 * detectors land on it — the target goes blocky while the scene stays as sharp
 * as the optics allow. That is exactly the real behaviour.
 *
 * Sampling is capped by the matrix: a device only HAS matrixH rows, so when its
 * own FOV is narrower than the window (long lens on a small sensor) the image is
 * magnified to fill the screen and the grid saturates at matrixH.
 *
 * The chain is ordered like a real camera — blur happens on the continuous
 * scene BEFORE the detector samples it, and noise is injected PER DETECTOR:
 *
 *   scene → optical blur (diffraction + aberration) → sample to grid
 *         → NETD noise per detector → display upscale
 *
 * Companion of sandbox-physics.ts (which owns DRI / Johnson numbers). This
 * module owns only how those numbers become pixels. Pure + deterministic.
 */

/** LWIR band centre (µm) — drives the diffraction limit. */
export const LWIR_LAMBDA_UM = 10;

/** Typical thermal objective speed (f/#). Fast glass, ~f/1.0–1.2. */
export const DEFAULT_F_NUMBER = 1.0;

/**
 * Gaussian σ (px) of the detector's own square aperture. A 1-px boxcar has
 * σ = 1/√12 ≈ 0.289 — this is why you never get detail finer than the pitch.
 */
export const PIXEL_APERTURE_SIGMA_PX = 0.289;

/**
 * Residual σ (px) for a production lens: assembly tolerance, defocus, and
 * MTF fall-off that no datasheet admits. Keeps "tiny pitch = free detail"
 * honest — it is bounded by glass, not by the detector.
 */
export const LENS_ABERRATION_SIGMA_PX = 0.35;

/** Never sample coarser than this (keeps the frame readable). */
export const MIN_GRID_ROWS = 16;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** IFOV in mrad: the angle subtended by one detector. */
export function ifovMrad(pitchUm: number, focalMm: number): number {
  return Math.max(0.0001, pitchUm) / Math.max(1, focalMm);
}

export type SensorGrid = {
  /** Detector rows spanning the display window (the sampling grid). */
  rows: number;
  /** Detector columns (square detectors, so derived from the aspect). */
  cols: number;
  ifovMrad: number;
  /** True when the matrix ran out of rows before the optics did. */
  matrixLimited: boolean;
  /** True when the device out-resolves the display at ×1 (zoom to inspect). */
  displayLimited: boolean;
};

/**
 * Detector sampling grid across the fixed display window.
 *
 * `boost` mirrors the sprite's display magnification so that the grain rendered
 * on the subject equals the Johnson pixels-on-target reported by the physics —
 * the picture and the numbers must never disagree.
 */
export function sensorGridForWindow(opts: {
  pitchUm: number;
  focalMm: number;
  matrixH: number;
  windowFovVertDeg: number;
  aspect: number;
  /** Sprite display magnification (zoom.ts DISPLAY_SIZE_BOOST). */
  boost?: number;
  /** Canvas rows — beyond this extra detail cannot be shown at ×1. */
  maxRows: number;
  /** Digital zoom: cropping the sensor image reveals finer sampling. */
  digitalZoom?: number;
}): SensorGrid {
  const {
    pitchUm,
    focalMm,
    matrixH,
    windowFovVertDeg,
    aspect,
    boost = 1,
    maxRows,
    digitalZoom = 1,
  } = opts;

  const ifov = ifovMrad(pitchUm, focalMm);
  const ifovRad = ifov / 1000;
  const windowRad = degToRad(Math.max(1, windowFovVertDeg));

  // Rows the optics could lay across the window…
  const opticalRows = windowRad / ifovRad / Math.max(0.1, boost);
  // …but the detector array only has matrixH of them.
  const availableRows = Math.min(opticalRows, Math.max(1, matrixH));

  // Digital zoom crops the grid, so the visible slice carries fewer detectors
  // spread over the same canvas — magnification without new information.
  const z = Math.max(1, digitalZoom);
  const visibleRows = availableRows / z;

  const rows = clamp(Math.round(visibleRows), MIN_GRID_ROWS, maxRows);

  return {
    rows,
    cols: Math.max(MIN_GRID_ROWS, Math.round(rows * Math.max(0.2, aspect))),
    ifovMrad: ifov,
    matrixLimited: opticalRows > matrixH,
    displayLimited: visibleRows > maxRows,
  };
}

/**
 * Diffraction blur σ in MICROMETRES at the focal plane.
 * The Airy pattern is well approximated by a Gaussian with σ ≈ 0.42·λ·N.
 * At λ=10 µm / f/1.0 that is ~4.2 µm — a third of a 12 µm detector, and over
 * half an 8 µm one, which is precisely why ultra-fine pitch stops paying off.
 */
export function diffractionSigmaUm(
  fNumber: number = DEFAULT_F_NUMBER,
  lambdaUm: number = LWIR_LAMBDA_UM
): number {
  return 0.42 * lambdaUm * Math.max(0.5, fNumber);
}

/**
 * Total pre-sampling blur σ expressed in DETECTOR pixels: diffraction, the
 * detector aperture, and lens aberration added in quadrature (independent
 * Gaussian contributions).
 */
export function opticalBlurSigmaPx(opts: {
  pitchUm: number;
  fNumber?: number;
  lambdaUm?: number;
}): number {
  const { pitchUm, fNumber = DEFAULT_F_NUMBER, lambdaUm = LWIR_LAMBDA_UM } = opts;
  const diffPx = diffractionSigmaUm(fNumber, lambdaUm) / Math.max(1, pitchUm);
  return Math.sqrt(
    diffPx * diffPx +
      PIXEL_APERTURE_SIGMA_PX * PIXEL_APERTURE_SIGMA_PX +
      LENS_ABERRATION_SIGMA_PX * LENS_ABERRATION_SIGMA_PX
  );
}

/**
 * Blur radius to apply on the full-resolution scene canvas, in CANVAS pixels.
 * Optical blur happens on the continuous image before sampling, so it must be
 * scaled by how many canvas pixels one detector covers.
 */
export function blurRadiusOnCanvasPx(opts: {
  pitchUm: number;
  fNumber?: number;
  canvasRows: number;
  gridRows: number;
}): number {
  const { pitchUm, fNumber, canvasRows, gridRows } = opts;
  const sigmaSensorPx = opticalBlurSigmaPx({ pitchUm, fNumber });
  const canvasPerDetector = canvasRows / Math.max(1, gridRows);
  return sigmaSensorPx * canvasPerDetector;
}

/**
 * Apparent thermal contrast of the target (K) after the atmosphere.
 * A live body sits ~8 K above a night forest; haze washes it toward ambient.
 */
export const TARGET_DELTA_T_K = 8;

/**
 * Signal-to-noise ratio on the target: apparent ΔT against detector NETD.
 * Falls with distance (transmission) and rises with a cleaner detector.
 */
export function targetSnr(opts: {
  netdMk: number;
  transmission: number;
  deltaTk?: number;
}): number {
  const { netdMk, transmission, deltaTk = TARGET_DELTA_T_K } = opts;
  const netdK = Math.max(1, netdMk) / 1000;
  return (deltaTk * clamp(transmission, 0, 1)) / netdK;
}

/**
 * Ceiling on per-detector noise (0–255 luma). Real gain control never lets a
 * frame collapse into pure static — it clips, and the scene stays readable.
 */
export const NOISE_AMP_MAX = 96;

/**
 * Per-detector noise amplitude (0–255 luma) from NETD and the target SNR.
 * Below SNR≈4 the target starts drowning — the classic thermal "boiling" look.
 */
export function noiseAmpFromSnr(opts: {
  netdMk: number;
  transmission: number;
  fog?: boolean;
  deltaTk?: number;
}): number {
  const { netdMk, transmission, fog = false, deltaTk } = opts;
  const snr = targetSnr({ netdMk, transmission, deltaTk });
  // Base grain scales with NETD; poor SNR amplifies what the eye perceives.
  const base = (Math.max(10, netdMk) / 30) * 16;
  const snrPenalty = clamp(6 / Math.max(0.5, snr), 0.55, 3.2);
  return clamp(base * snrPenalty * (fog ? 1.5 : 1), 0, NOISE_AMP_MAX);
}

/**
 * Detector rows landing on the subject — the honest "detail on target".
 * Must equal the Johnson pixels-on-target from sandbox-physics; the sandbox
 * asserts this so a drifting render can never out-run the stated numbers.
 */
export function renderedRowsOnSubject(
  subjectHeightFrac: number,
  grid: SensorGrid
): number {
  return Math.max(0, subjectHeightFrac) * grid.rows;
}
