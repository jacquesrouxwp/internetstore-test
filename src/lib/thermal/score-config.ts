/**
 * Tunable anchors / weights for thermal-score.ts.
 * Change these without touching scoring logic.
 */

/** Piecewise anchors: [value, score 0..100] */
export type ScoreAnchors = [number, number][];

/** Resolution score by horizontal pixels */
export const RESOLUTION_ANCHORS: ScoreAnchors = [
  [160, 30],
  [256, 45],
  [384, 60],
  [640, 80],
  [1024, 92],
  [1280, 98],
];

/** NETD mK — lower is better */
export const NETD_ANCHORS: ScoreAnchors = [
  [15, 100],
  [20, 96],
  [25, 90],
  [35, 76],
  [40, 66],
  [50, 50],
  [60, 40],
];

/** Passport detection range (human), meters */
export const DETECTION_ANCHORS: ScoreAnchors = [
  [400, 25],
  [800, 45],
  [1500, 68],
  [2200, 82],
  [3000, 92],
  [4000, 99],
];

/** Refresh rate thresholds */
export const REFRESH = {
  highHz: 50,
  highScore: 100,
  midHz: 30,
  midScore: 72,
  lowScore: 60,
} as const;

/** Image quality blend */
export const IMAGE_QUALITY_WEIGHTS = {
  resolution: 0.55,
  netd: 0.35,
  refresh: 0.1,
} as const;

/** Overall thermal performance blend */
export const THERMAL_PERF_WEIGHTS = {
  imageQuality: 0.5,
  detection: 0.4,
  refresh: 0.1,
} as const;

/**
 * Catalog prices are UAH. Convert to EUR for value-for-money anchors
 * (same formula as design: perf / (priceEur/1000)).
 */
export const UAH_PER_EUR = 42;

/**
 * Value for money: normalize perf-per-1000€ into 0..100.
 * lo ≈ expensive gear, hi ≈ strong bargain.
 */
export const VALUE_PERF_PER_K_EUR = {
  lo: 12,
  hi: 55,
} as const;

/** Default pitch µm when unknown */
export const DEFAULT_PITCH_UM = 12;

/** UI color bands */
export const SCORE_COLOR_BANDS = {
  low: 50, // <50 red
  mid: 75, // 50–75 yellow, >75 green
} as const;
