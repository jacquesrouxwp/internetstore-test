/**
 * Extract thermal simulator inputs from product fields / specs.
 */

export type ThermalMatrix = 256 | 384 | 640;

export type ThermalProductInput = {
  resolution?: string | null;
  detectionRangeM?: number | null;
  specs?: Record<string, string> | null;
  name?: string;
};

export type ThermalSimParams = {
  matrix: ThermalMatrix;
  detectionRangeM: number;
  /** Noise-equivalent temperature difference (mK), lower = cleaner */
  netdMk: number;
  refreshRateHz: number | null;
  label: string;
};

function parseMatrix(res?: string | null, specs?: Record<string, string> | null): ThermalMatrix {
  const raw = `${res || ""} ${specs?.["Матриця"] || specs?.["Матрица"] || ""}`;
  if (/640\s*[x×]\s*512/i.test(raw) || /\b640\b/.test(raw)) return 640;
  if (/384\s*[x×]\s*288/i.test(raw) || /\b384\b/.test(raw)) return 384;
  if (/256\s*[x×]\s*192/i.test(raw) || /\b256\b/.test(raw)) return 256;
  if (/160\s*[x×]\s*120/i.test(raw)) return 256;
  return 384;
}

function parseNetd(specs?: Record<string, string> | null): number {
  const raw = `${specs?.["NETD"] || specs?.["Netd"] || specs?.["netd"] || ""}`;
  const m = raw.match(/(\d{1,3})/);
  if (m) return Math.min(80, Math.max(15, Number(m[1])));
  return 35;
}

function parseRefresh(specs?: Record<string, string> | null): number | null {
  const raw = `${specs?.["Частота"] || specs?.["Frequency"] || ""}`;
  const m = raw.match(/(\d{2})\s*(Гц|Hz|гц)/i);
  if (m) return Number(m[1]);
  if (/\b50\b/.test(raw)) return 50;
  if (/\b25\b/.test(raw)) return 25;
  return null;
}

function parseRange(
  detectionRangeM?: number | null,
  specs?: Record<string, string> | null
): number {
  if (detectionRangeM != null && Number.isFinite(detectionRangeM) && detectionRangeM > 0) {
    return Math.round(detectionRangeM);
  }
  for (const [k, v] of Object.entries(specs || {})) {
    if (/дальн|detection|range|виявлен|обнаруж/i.test(k)) {
      const m = String(v).match(/(\d{3,5})/);
      if (m) return Number(m[1]);
    }
  }
  return 1200;
}

/** Offscreen render width for matrix pixelation */
export function matrixPixelWidth(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 240;
  if (matrix >= 384) return 144;
  return 96;
}

export function parseProductThermal(p: ThermalProductInput): ThermalSimParams {
  return {
    matrix: parseMatrix(p.resolution, p.specs),
    detectionRangeM: parseRange(p.detectionRangeM, p.specs),
    netdMk: parseNetd(p.specs),
    refreshRateHz: parseRefresh(p.specs),
    label: p.name || "Thermal",
  };
}

export type DetectStatus =
  | "identify"
  | "recognize"
  | "detect"
  | "none";

/**
 * score from target scale + matrix + weather + NETD → status bands.
 * Higher score = better visibility.
 */
export function computeDetectStatus(opts: {
  distanceM: number;
  maxRangeM: number;
  matrix: ThermalMatrix;
  netdMk: number;
  fog: boolean;
}): DetectStatus {
  const { distanceM, maxRangeM, matrix, netdMk, fog } = opts;
  // Target apparent scale ~ inverse distance (clamped)
  const scale = Math.max(0.05, Math.min(1, maxRangeM / Math.max(distanceM, 1) / 3));
  const matrixF = matrix / 640;
  const netdF = Math.max(0.35, Math.min(1.15, 40 / Math.max(netdMk, 15)));
  const fogF = fog ? 0.55 : 1;
  const score = scale * matrixF * netdF * fogF;

  // Relative to max range: beyond maxRange → none
  if (distanceM > maxRangeM * 1.05) return "none";
  if (score >= 0.42) return "identify";
  if (score >= 0.22) return "recognize";
  if (score >= 0.1) return "detect";
  return "none";
}
