/**
 * Distance-aware scoring for the thermal simulator.
 *
 * The whole point of the two-model comparison: at short range both devices
 * resolve the target almost equally (scores saturate → tiny gap), while at long
 * range only the higher-spec device still resolves it (scores diverge → big
 * gap). That is a direct consequence of the Johnson criterion:
 *
 *   pixels-on-target = 2 · D / distance          (from parse-product-thermal)
 *
 * so px scales as 1/distance for every model. A *scale-invariant* metric would
 * show the same gap at all distances — the honest behaviour comes entirely from
 * `resolveScore()` SATURATING above the identification threshold: near targets
 * are "already perfect" for both models, far targets sit on the steep part of
 * the curve where a bigger D wins.
 *
 * Nothing here re-implements the optics or Johnson math — it reuses
 * `pixelsOnTarget` / `JOHNSON` from parse-product-thermal and
 * `atmosphericTransmission` from zoom.
 */

import {
  JOHNSON,
  pixelsOnTarget,
  type ThermalMatrix,
} from "./parse-product-thermal";
import { atmosphericTransmission, DIST_MIN_M } from "./zoom";

/** Shared target selector — changes pixels-on-target for BOTH panels. */
export type ThermalTarget = "human" | "deer" | "boar" | "fox";

export const THERMAL_TARGETS: ThermalTarget[] = ["human", "deer", "boar", "fox"];

/**
 * Relative Johnson target size, normalised to the scene's deer (= 1.0). A bigger
 * warm cross-section presents more pixels at the same distance, so detection is
 * easier. Passport D is quoted for this reference target; picking a smaller
 * animal (fox) rescales px down for both models identically.
 */
export const TARGET_FACTOR: Record<ThermalTarget, number> = {
  deer: 1.0,
  human: 0.95,
  boar: 0.75,
  fox: 0.45,
};

export const TARGET_LABEL_UK: Record<ThermalTarget, string> = {
  human: "Людина",
  deer: "Олень",
  boar: "Кабан",
  fox: "Лисиця",
};
export const TARGET_LABEL_RU: Record<ThermalTarget, string> = {
  human: "Человек",
  deer: "Олень",
  boar: "Кабан",
  fox: "Лисица",
};

/** Minimal model shape the scoring needs (a subset of ThermalSimParams). */
export type ScoreModel = {
  matrix: ThermalMatrix;
  detectionRangeM: number;
  netdMk: number;
  priceUah?: number | null;
};

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Monotone piecewise-linear interpolation over sorted (x, y) anchors. */
function interp(anchors: readonly [number, number][], x: number): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

/**
 * Target-aware pixels on target: base Johnson px rescaled by target size and,
 * optionally, reduced by fog (same 0.6 attenuation the status badge uses).
 */
export function pxOnTarget(
  distanceM: number,
  detectionRangeM: number,
  target: ThermalTarget = "deer",
  fog = false
): number {
  let px = pixelsOnTarget(distanceM, detectionRangeM) * TARGET_FACTOR[target];
  if (fog) px *= 0.6;
  return Math.max(0, px);
}

/**
 * Johnson-anchored resolve score 0..100. Anchored on the detection (2),
 * recognition (8) and identification (13) thresholds and deliberately
 * SATURATING above identification — that saturation is what makes near-range
 * gaps small and long-range gaps large. Monotone non-decreasing and concave.
 */
const RESOLVE_ANCHORS: readonly [number, number][] = [
  [0, 0],
  [JOHNSON.detect, 32], // 2 px — just detectable
  [5, 55],
  [JOHNSON.recognize, 70], // 8 px — recognisable
  [JOHNSON.identify, 86], // 13 px — identifiable
  [18, 95],
  [24, 98],
  [34, 99.5],
  [48, 100], // saturated: extra pixels no longer help
];

export function resolveScore(px: number): number {
  return clamp(interp(RESOLVE_ANCHORS, Math.max(0, px)), 0, 100);
}

/**
 * Detection-focused score (0..100) — saturates already by the identification
 * threshold, so a device can still score well for raw *detection* at ranges
 * where the fine-detail Performance score has collapsed. Emphasises passport D.
 */
const DETECT_ANCHORS: readonly [number, number][] = [
  [0, 0],
  [1, 45],
  [JOHNSON.detect, 65], // 2 px
  [4, 82],
  [JOHNSON.recognize, 94], // 8 px
  [JOHNSON.identify, 100], // 13 px
];

export function detectionScore(
  model: ScoreModel,
  distanceM: number,
  target: ThermalTarget = "deer",
  fog = false
): number {
  const px = pxOnTarget(distanceM, model.detectionRangeM, target, fog);
  return clamp(interp(DETECT_ANCHORS, px), 0, 100);
}

/**
 * Thermal Performance: how well the target is *resolved* at this distance.
 * Pure resolveScore(px) — the headline distance-driven metric.
 */
export function performanceAtDistance(
  model: ScoreModel,
  distanceM: number,
  target: ThermalTarget = "deer",
  fog = false
): number {
  return resolveScore(pxOnTarget(distanceM, model.detectionRangeM, target, fog));
}

/** Static sensor cleanliness from matrix + NETD (0..100), before atmosphere. */
function imageQualityBase(matrix: ThermalMatrix, netdMk: number): number {
  const matrixComponent = matrix >= 640 ? 92 : matrix >= 384 ? 75 : 55;
  // NETD 15 mK → 100, 80 mK → ~10 (lower is cleaner).
  const netdComponent = clamp(100 - (netdMk - 15) * (90 / 65), 0, 100);
  return 0.6 * matrixComponent + 0.4 * netdComponent;
}

/**
 * Image Quality at distance: sensor cleanliness degraded by atmospheric
 * transmission (distant targets wash toward background temperature).
 */
export function imageQualityScore(
  model: ScoreModel,
  distanceM: number,
  fog = false
): number {
  const base = imageQualityBase(model.matrix, model.netdMk);
  const trans = atmosphericTransmission(distanceM, model.detectionRangeM, fog);
  return clamp(base * trans, 0, 100);
}

/**
 * Reference "resolve points per 1000 UAH" that maps to a top Value score.
 * A cheap device that resolves the target well scores high; an expensive one
 * scores low even at the same performance — this is what shows the buyer that
 * paying for range they don't need at short distance is wasteful.
 */
const VALUE_REF = 3.5;

export function valueAtDistance(
  model: ScoreModel,
  distanceM: number,
  target: ThermalTarget = "deer",
  fog = false
): number {
  const priceUah = model.priceUah && model.priceUah > 0 ? model.priceUah : null;
  if (!priceUah) return 0;
  const perf = performanceAtDistance(model, distanceM, target, fog);
  const raw = perf / (priceUah / 1000);
  return clamp((100 * raw) / VALUE_REF, 0, 100);
}

export type ScoreBreakdown = {
  performance: number;
  range: number;
  image: number;
  value: number;
  total: number;
};

/** Weights for the composite Total Score (documented, sum = 1). */
export const SCORE_WEIGHTS = {
  performance: 0.4,
  range: 0.2,
  image: 0.2,
  value: 0.2,
} as const;

export function scoreModelAtDistance(
  model: ScoreModel,
  distanceM: number,
  target: ThermalTarget = "deer",
  fog = false
): ScoreBreakdown {
  const performance = performanceAtDistance(model, distanceM, target, fog);
  const range = detectionScore(model, distanceM, target, fog);
  const image = imageQualityScore(model, distanceM, fog);
  const value = valueAtDistance(model, distanceM, target, fog);
  const total =
    SCORE_WEIGHTS.performance * performance +
    SCORE_WEIGHTS.range * range +
    SCORE_WEIGHTS.image * image +
    SCORE_WEIGHTS.value * value;
  return {
    performance: Math.round(performance),
    range: Math.round(range),
    image: Math.round(image),
    value: Math.round(value),
    total: Math.round(total),
  };
}

/**
 * Percentage gap between two scores, relative to the leader:
 *   gap% = (hi − lo) / hi × 100
 * Bounded 0..100, symmetric in its arguments (A/B order does not matter).
 */
export function gapPct(scoreA: number, scoreB: number): number {
  const hi = Math.max(scoreA, scoreB);
  const lo = Math.min(scoreA, scoreB);
  if (hi <= 0) return 0;
  return ((hi - lo) / hi) * 100;
}

/**
 * Performance gap between two models at a distance (headline number), plus which
 * model leads. Uses performanceAtDistance so it matches the "Math" breakdown.
 */
export function performanceGapAt(
  a: ScoreModel,
  b: ScoreModel,
  distanceM: number,
  target: ThermalTarget = "deer",
  fog = false
): { gap: number; leader: "a" | "b" | "tie" } {
  const pa = performanceAtDistance(a, distanceM, target, fog);
  const pb = performanceAtDistance(b, distanceM, target, fog);
  const gap = gapPct(pa, pb);
  const leader = Math.abs(pa - pb) < 1e-9 ? "tie" : pa > pb ? "a" : "b";
  return { gap, leader };
}

/**
 * Crossover distance (m): the smallest distance at which the performance gap
 * first exceeds `gapThreshold` (%). Below it the two models are effectively
 * equal (buy the cheaper); beyond it the higher-spec model pulls ahead.
 * Returns null when the gap never reaches the threshold (identical models).
 */
export function crossoverM(
  a: ScoreModel,
  b: ScoreModel,
  opts: {
    target?: ThermalTarget;
    fog?: boolean;
    gapThreshold?: number;
    minM?: number;
    maxM?: number;
    stepM?: number;
  } = {}
): number | null {
  const {
    target = "deer",
    fog = false,
    gapThreshold = 8,
    minM = DIST_MIN_M,
    maxM = Math.max(a.detectionRangeM, b.detectionRangeM),
    stepM = 10,
  } = opts;
  for (let d = minM; d <= maxM; d += stepM) {
    const g = performanceGapAt(a, b, d, target, fog).gap;
    if (g >= gapThreshold) return d;
  }
  return null;
}
