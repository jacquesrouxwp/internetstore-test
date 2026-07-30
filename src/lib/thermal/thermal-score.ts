/**
 * thermal-score.ts — deterministic scoring from product specs (no AI).
 * Transparent formulas; anchors/weights in score-config.ts.
 */

import {
  DETECTION_ANCHORS,
  IMAGE_QUALITY_WEIGHTS,
  NETD_ANCHORS,
  REFRESH,
  RESOLUTION_ANCHORS,
  THERMAL_PERF_WEIGHTS,
  UAH_PER_EUR,
  VALUE_PERF_PER_K_EUR,
  DEFAULT_PITCH_UM,
  type ScoreAnchors,
} from "./score-config";
import {
  defaultDetectionRangeM,
  defaultNetdMk,
  parseMatrix,
  parseNetd,
  parseRefresh,
  parseRange,
  matrixVertPixels,
  type ThermalMatrix,
} from "./parse-product-thermal";
import type { Product } from "@/types";

export interface Specs {
  hPixels: number;
  vPixels: number;
  pixelPitchUm: number;
  netdMk: number;
  refreshHz: number;
  /** Passport / calculated human detection range (m) */
  detectionRangeM: number;
  /** Price in EUR (catalog UAH is converted via config) */
  priceEur: number;
}

export type ThermalScores = {
  thermalPerformance: number;
  detectionRange: number;
  imageQuality: number;
  valueForMoney: number;
};

export type ScoreBreakdown = {
  scores: ThermalScores;
  specs: Specs;
  /** Human-readable factor lists for «Чому?» (uk keys; UI maps to locale) */
  factors: {
    thermalPerformance: string[];
    detectionRange: string[];
    imageQuality: string[];
    valueForMoney: string[];
  };
};

/** Linear normalize v∈[lo,hi] → 0..100 with clamp */
export function nz(v: number, lo: number, hi: number): number {
  if (hi === lo) return 0;
  return Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
}

/** Piecewise linear interpolation by anchors [value, score] */
export function pw(x: number, p: ScoreAnchors): number {
  if (p.length === 0) return 0;
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

// ─── Atomic scores ────────────────────────────────────────────────────────

export function resolutionScore(h: number): number {
  return pw(h, RESOLUTION_ANCHORS);
}

export function netdScore(n: number): number {
  return pw(n, NETD_ANCHORS);
}

export function refreshScore(hz: number): number {
  if (hz >= REFRESH.highHz) return REFRESH.highScore;
  if (hz >= REFRESH.midHz) return REFRESH.midScore;
  return REFRESH.lowScore;
}

export function detectionScore(D: number): number {
  return pw(D, DETECTION_ANCHORS);
}

// ─── Composite metrics ────────────────────────────────────────────────────

export function imageQuality(s: Specs): number {
  const w = IMAGE_QUALITY_WEIGHTS;
  return Math.round(
    w.resolution * resolutionScore(s.hPixels) +
      w.netd * netdScore(s.netdMk) +
      w.refresh * refreshScore(s.refreshHz)
  );
}

export function thermalPerformance(s: Specs): number {
  const w = THERMAL_PERF_WEIGHTS;
  const iq = imageQuality(s);
  return Math.round(
    w.imageQuality * iq +
      w.detection * detectionScore(s.detectionRangeM) +
      w.refresh * refreshScore(s.refreshHz)
  );
}

export function valueForMoney(s: Specs): number {
  const priceEur = Math.max(1, s.priceEur);
  const perfPerK = thermalPerformance(s) / (priceEur / 1000);
  return Math.round(
    nz(perfPerK, VALUE_PERF_PER_K_EUR.lo, VALUE_PERF_PER_K_EUR.hi)
  );
}

export function scores(s: Specs): ThermalScores {
  return {
    thermalPerformance: thermalPerformance(s),
    detectionRange: Math.round(detectionScore(s.detectionRangeM)),
    imageQuality: imageQuality(s),
    valueForMoney: valueForMoney(s),
  };
}

/** «краще за X% моделей» — share of catalog with strictly lower score */
export function percentile(v: number, all: number[]): number {
  if (!all.length) return 0;
  return Math.round((all.filter((x) => x < v).length / all.length) * 100);
}

// ─── Product → Specs ──────────────────────────────────────────────────────

export function specsFromProduct(
  p: Pick<
    Product,
    "resolution" | "detectionRangeM" | "specs" | "price" | "nameUk" | "nameRu"
  >
): Specs {
  const matrix = parseMatrix(p.resolution, p.specs) as ThermalMatrix;
  const hPixels = matrix;
  const vPixels = matrixVertPixels(matrix);
  // Use matrix default when no NETD key in specs (parseNetd alone defaults to 35)
  const hasNetd = Boolean(
    p.specs &&
      Object.keys(p.specs).some((k) => /netd/i.test(k + (p.specs?.[k] || "")))
  );
  const netd = hasNetd ? parseNetd(p.specs) : defaultNetdMk(matrix);

  const refreshParsed = parseRefresh(p.specs);
  const refreshHz = refreshParsed ?? 50;

  const detectionRangeM = parseRange(
    p.detectionRangeM,
    p.specs,
    matrix
  );

  // Pitch optional from specs
  let pixelPitchUm = DEFAULT_PITCH_UM;
  if (p.specs) {
    for (const [k, v] of Object.entries(p.specs)) {
      if (/pitch|піксель|пиксель|мкм|µm/i.test(k + " " + v)) {
        const m = String(v).match(/\b(17|12|10|8)\b/);
        if (m) pixelPitchUm = Number(m[1]);
      }
    }
  }

  const priceEur = Math.max(1, (p.price || 0) / UAH_PER_EUR);

  return {
    hPixels,
    vPixels,
    pixelPitchUm,
    netdMk: netd,
    refreshHz,
    detectionRangeM,
    priceEur,
  };
}

export function scoreProduct(
  p: Pick<
    Product,
    "resolution" | "detectionRangeM" | "specs" | "price" | "nameUk" | "nameRu"
  >
): ScoreBreakdown {
  const s = specsFromProduct(p);
  const sc = scores(s);

  const factors = {
    imageQuality: [
      `matrix_${s.hPixels}x${s.vPixels}`,
      `netd_${s.netdMk}`,
      `refresh_${s.refreshHz}`,
    ],
    detectionRange: [`detection_m_${s.detectionRangeM}`],
    thermalPerformance: [
      `iq_w_${IMAGE_QUALITY_WEIGHTS.resolution}`,
      `matrix_${s.hPixels}`,
      `netd_${s.netdMk}`,
      `detection_m_${s.detectionRangeM}`,
      `refresh_${s.refreshHz}`,
    ],
    valueForMoney: [
      `perf_${sc.thermalPerformance}`,
      `price_eur_${Math.round(s.priceEur)}`,
    ],
  };

  return { scores: sc, specs: s, factors };
}

export function isThermalProduct(p: Product): boolean {
  if (p.resolution) return true;
  if (p.detectionRangeM != null && p.detectionRangeM > 0) return true;
  const cat = p.categorySlug || "";
  if (/teploviz|thermal|pricil|mono|binokl|приціл|тепло/i.test(cat)) return true;
  if (p.specs) {
    const blob = Object.keys(p.specs).join(" ") + Object.values(p.specs).join(" ");
    if (/netd|матриц|matrix|тепло|thermal/i.test(blob)) return true;
  }
  return false;
}

/** Batch: performance scores for percentile ranking */
export function catalogPerformanceScores(products: Product[]): number[] {
  return products.filter(isThermalProduct).map((p) => scoreProduct(p).scores.thermalPerformance);
}

export function scoreColorClass(score: number): "low" | "mid" | "high" {
  if (score < 50) return "low";
  if (score <= 75) return "mid";
  return "high";
}
