/**
 * thermal-score-distance.ts — scores that depend on range (Johnson px on target).
 * Deterministic; no AI. Uses same Specs as thermal-score.ts.
 */

import {
  imageQuality,
  netdScore,
  nz,
  type Specs,
  type ThermalScores,
} from "./thermal-score";
import { VALUE_PERF_PER_K_EUR } from "./score-config";
import {
  detectionRangeForTarget,
  type ThermalTargetId,
} from "./targets";

export type ScoreTargetId = Extract<
  ThermalTargetId,
  "human" | "deer" | "boar" | "fox"
>;

/** Minimal sensor view for Johnson passport model */
export type Sensor = {
  /** Passport detection range for human (m) */
  detectionRangeHumanM: number;
  hPixels: number;
  pixelPitchUm: number;
};

const TARGET_CRIT_M: Record<ScoreTargetId, number> = {
  human: 0.75,
  deer: 1.0,
  boar: 0.7,
  fox: 0.3,
};

/** Piecewise anchors for resolveScore */
const RESOLVE_ANCHORS: [number, number][] = [
  [0, 0],
  [2, 52],
  [8, 85],
  [13, 97],
  [25, 100],
];

function pw(x: number, p: [number, number][]): number {
  if (x <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[i + 1];
    if (x <= x1) {
      if (x1 === x0) return y1;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return p[p.length - 1][1];
}

export function sensorFromSpecs(s: Specs): Sensor {
  return {
    detectionRangeHumanM: s.detectionRangeM,
    hPixels: s.hPixels,
    pixelPitchUm: s.pixelPitchUm,
  };
}

/**
 * Johnson passport model: px = 2 × D_target / d
 * D_target scales passport human D by critical size / 0.75 m.
 */
export function pixelsOnTarget(
  sensor: Sensor,
  target: ScoreTargetId,
  distanceM: number
): number {
  const size = TARGET_CRIT_M[target] ?? 0.75;
  const Dtarget = detectionRangeForTarget(
    sensor.detectionRangeHumanM,
    size,
    0.75
  );
  const d = Math.max(1, distanceM);
  return (2 * Dtarget) / d;
}

/** How readable the target is at this distance (Johnson 2 / 8 / 13) */
export function resolveScore(px: number): number {
  return pw(px, RESOLVE_ANCHORS);
}

/** Effective thermal performance at a concrete distance */
export function performanceAtDistance(
  s: Specs,
  sensor: Sensor,
  d: number,
  target: ScoreTargetId = "human"
): number {
  const px = pixelsOnTarget(sensor, target, d);
  const resolve = resolveScore(px);
  return Math.round(
    0.6 * resolve + 0.25 * imageQuality(s) + 0.15 * netdScore(s.netdMk)
  );
}

export function valueAtDistance(
  s: Specs,
  sensor: Sensor,
  d: number,
  target: ScoreTargetId = "human"
): number {
  const perf = performanceAtDistance(s, sensor, d, target);
  const priceEur = Math.max(1, s.priceEur);
  return Math.round(
    nz(perf / (priceEur / 1000), VALUE_PERF_PER_K_EUR.lo, VALUE_PERF_PER_K_EUR.hi)
  );
}

/** Detection card at distance = resolve quality from Johnson px */
export function detectionAtDistance(
  sensor: Sensor,
  d: number,
  target: ScoreTargetId = "human"
): number {
  return Math.round(resolveScore(pixelsOnTarget(sensor, target, d)));
}

/**
 * Image quality soft-modulated by resolve at range
 * (sensor still matters, but unreadable target demotes IQ).
 */
export function imageQualityAtDistance(
  s: Specs,
  sensor: Sensor,
  d: number,
  target: ScoreTargetId = "human"
): number {
  const iq = imageQuality(s);
  const resolve = resolveScore(pixelsOnTarget(sensor, target, d));
  return Math.round(0.65 * iq + 0.35 * resolve);
}

export function scoresAtDistance(
  s: Specs,
  sensor: Sensor,
  d: number,
  target: ScoreTargetId = "human"
): ThermalScores & { total: number; pixelsOnTarget: number } {
  const px = pixelsOnTarget(sensor, target, d);
  const thermalPerformance = performanceAtDistance(s, sensor, d, target);
  const detectionRange = detectionAtDistance(sensor, d, target);
  const iq = imageQualityAtDistance(s, sensor, d, target);
  const valueForMoney = valueAtDistance(s, sensor, d, target);
  // Total = same as distance thermal performance (primary KPI)
  const total = thermalPerformance;
  return {
    thermalPerformance,
    detectionRange,
    imageQuality: iq,
    valueForMoney,
    total,
    pixelsOnTarget: px,
  };
}

/** % gap of a vs b: (a−b)/b × 100 */
export function gapPct(aP: number, bP: number): number {
  if (bP === 0) return aP > 0 ? 100 : 0;
  return Math.round(((aP - bP) / bP) * 100);
}

/**
 * Distance from which better model's advantage becomes noticeable
 * (gap ≥ thresholdPct). Returns 50…3000 m.
 */
export function crossoverM(
  cheap: { s: Specs; sensor: Sensor },
  better: { s: Specs; sensor: Sensor },
  thresholdPct = 8,
  target: ScoreTargetId = "human"
): number {
  for (let d = 50; d <= 3000; d += 50) {
    const a = performanceAtDistance(better.s, better.sensor, d, target);
    const b = performanceAtDistance(cheap.s, cheap.sensor, d, target);
    if (gapPct(a, b) >= thresholdPct) return d;
  }
  return 3000;
}

/** Median of number list */
export function median(nums: number[]): number {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

export type CatalogPeer = {
  id: string;
  name: string;
  specs: Specs;
  sensor: Sensor;
  priceEur: number;
};

/**
 * Pick a cheaper peer (median of cheaper half) for crossover insight.
 * Falls back to overall median peer.
 */
export function pickComparePeer(
  self: CatalogPeer,
  peers: CatalogPeer[],
  d: number,
  target: ScoreTargetId
): CatalogPeer | null {
  const others = peers.filter((p) => p.id !== self.id);
  if (!others.length) return null;

  const cheaper = others.filter((p) => p.priceEur < self.priceEur * 0.95);
  const pool = cheaper.length >= 2 ? cheaper : others;

  // Peer with median performance at this distance
  const ranked = pool
    .map((p) => ({
      p,
      perf: performanceAtDistance(p.specs, p.sensor, d, target),
    }))
    .sort((a, b) => a.perf - b.perf);
  const mid = ranked[Math.floor(ranked.length / 2)];
  return mid?.p ?? null;
}

export function catalogMedianPerfAtDistance(
  peers: CatalogPeer[],
  d: number,
  target: ScoreTargetId
): number {
  const perfs = peers.map((p) =>
    performanceAtDistance(p.specs, p.sensor, d, target)
  );
  return median(perfs);
}
