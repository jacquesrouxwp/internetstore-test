/**
 * Extract thermal simulator inputs from product fields / specs.
 * Detection status uses Johnson criteria (2 / 8 / 13 pixels on target).
 */

export type ThermalMatrix = 256 | 384 | 640;

export type ThermalProductInput = {
  resolution?: string | null;
  detectionRangeM?: number | null;
  specs?: Record<string, string> | null;
  /** Display label only — never used to parse matrix (avoids false positives in names). */
  name?: string;
};

export type ThermalSimParams = {
  matrix: ThermalMatrix;
  /** Passport detection range D (m) — Johnson calibration anchor */
  detectionRangeM: number;
  /** Noise-equivalent temperature difference (mK), lower = cleaner */
  netdMk: number;
  refreshRateHz: number | null;
  label: string;
};

/** Lightweight catalog row for model comparison dropdowns */
export type ThermalCompareOption = {
  id: string;
  slug: string;
  name: string;
  matrix: ThermalMatrix;
  detectionRangeM: number;
  netdMk: number;
  refreshRateHz: number | null;
};

/**
 * Typical detection range D for large animal / deer when product has no value.
 * Mid of industry ranges: 256→800–1300, 384→1300–1900, 640→1900–2800.
 */
export function defaultDetectionRangeM(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 2350;
  if (matrix >= 384) return 1600;
  return 1050;
}

/** Typical NETD (mK) for matrix class presets */
export function defaultNetdMk(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 25;
  if (matrix >= 384) return 35;
  return 40;
}

/** Quick-compare presets: generation classes */
export function matrixClassPreset(matrix: ThermalMatrix): ThermalSimParams {
  return {
    matrix,
    detectionRangeM: defaultDetectionRangeM(matrix),
    netdMk: defaultNetdMk(matrix),
    refreshRateHz: 50,
    label: `${matrix}×${matrix === 640 ? 512 : matrix === 384 ? 288 : 192}`,
  };
}

/**
 * Parse sensor matrix from resolution field + specs only.
 * Never from product name (avoids "…640…" false positives in titles).
 * Prefer full patterns like 640×512 over bare digits.
 */
export function parseMatrix(
  res?: string | null,
  specs?: Record<string, string> | null
): ThermalMatrix {
  const specParts: string[] = [];
  if (res) specParts.push(res);
  if (specs) {
    for (const [k, v] of Object.entries(specs)) {
      if (/матриц|matrix|разрешен|розділ|resolution|сенсор|sensor/i.test(k)) {
        specParts.push(String(v));
      }
    }
    // Common exact keys
    if (specs["Матриця"]) specParts.push(specs["Матриця"]);
    if (specs["Матрица"]) specParts.push(specs["Матрица"]);
    if (specs["Resolution"]) specParts.push(specs["Resolution"]);
  }
  const raw = specParts.join(" ");

  // Full WxH patterns first
  if (/640\s*[x×]\s*512/i.test(raw)) return 640;
  if (/384\s*[x×]\s*288/i.test(raw)) return 384;
  if (/256\s*[x×]\s*192/i.test(raw)) return 256;
  if (/160\s*[x×]\s*120/i.test(raw)) return 256;

  // Bare width only when clearly a matrix token (not arbitrary number in a long string)
  if (/(?:^|[^\d])640(?:[^\d]|$)/.test(raw) && /512|matrix|матриц/i.test(raw))
    return 640;
  if (/(?:^|[^\d])384(?:[^\d]|$)/.test(raw)) return 384;
  if (/(?:^|[^\d])256(?:[^\d]|$)/.test(raw)) return 256;

  // Resolution-only field like "640" or "640x512" already handled; pure "640"
  const resOnly = (res || "").trim();
  if (/^640(\s*[x×]\s*512)?$/i.test(resOnly)) return 640;
  if (/^384(\s*[x×]\s*288)?$/i.test(resOnly)) return 384;
  if (/^256(\s*[x×]\s*192)?$/i.test(resOnly)) return 256;

  return 384;
}

export function parseNetd(specs?: Record<string, string> | null): number {
  const raw = `${specs?.["NETD"] || specs?.["Netd"] || specs?.["netd"] || ""}`;
  const m = raw.match(/(\d{1,3})/);
  if (m) return Math.min(80, Math.max(15, Number(m[1])));
  return 35;
}

export function parseRefresh(specs?: Record<string, string> | null): number | null {
  const raw = `${specs?.["Частота"] || specs?.["Frequency"] || ""}`;
  const m = raw.match(/(\d{2})\s*(Гц|Hz|гц)/i);
  if (m) return Number(m[1]);
  if (/\b50\b/.test(raw)) return 50;
  if (/\b25\b/.test(raw)) return 25;
  return null;
}

export function parseRange(
  detectionRangeM: number | null | undefined,
  specs: Record<string, string> | null | undefined,
  matrix: ThermalMatrix
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
  return defaultDetectionRangeM(matrix);
}

/**
 * Offscreen width for matrix pixelation (visual grain only).
 * 256 → large pixels, 384 → medium, 640 → fine.
 */
export function matrixPixelWidth(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 240;
  if (matrix >= 384) return 144;
  return 96;
}

export function parseProductThermal(p: ThermalProductInput): ThermalSimParams {
  const matrix = parseMatrix(p.resolution, p.specs);
  return {
    matrix,
    detectionRangeM: parseRange(p.detectionRangeM, p.specs, matrix),
    netdMk: parseNetd(p.specs),
    refreshRateHz: parseRefresh(p.specs),
    label: p.name || "Thermal",
  };
}

export function toCompareOption(
  p: ThermalProductInput & { id: string; slug: string }
): ThermalCompareOption {
  const sim = parseProductThermal(p);
  return {
    id: p.id,
    slug: p.slug,
    name: sim.label,
    matrix: sim.matrix,
    detectionRangeM: sim.detectionRangeM,
    netdMk: sim.netdMk,
    refreshRateHz: sim.refreshRateHz,
  };
}

export type DetectStatus =
  | "identify"
  | "recognize"
  | "detect"
  | "none";

/**
 * Johnson criteria: pixels on target at distance.
 * At dist = D (detection range) → 2 px (threshold of detection).
 * recognize ≈ D/4 (8 px), identify ≈ D/6.5 (13 px).
 */
export function pixelsOnTarget(distanceM: number, detectionRangeM: number): number {
  const dist = Math.max(distanceM, 1);
  const D = Math.max(detectionRangeM, 1);
  return (2 * D) / dist;
}

/**
 * Status from Johnson pixel count (calibrated to passport D).
 * Optional fog reduces effective pixels (atmospheric attenuation).
 * NETD / matrix do NOT change status — they affect noise & pixelation visuals only.
 */
export function computeDetectStatus(opts: {
  distanceM: number;
  /** Passport detection range D (m) */
  maxRangeM: number;
  matrix?: ThermalMatrix;
  netdMk?: number;
  fog?: boolean;
}): DetectStatus {
  const { distanceM, maxRangeM, fog = false } = opts;
  let px = pixelsOnTarget(distanceM, maxRangeM);
  if (fog) px *= 0.6;

  if (px >= 13) return "identify";
  if (px >= 8) return "recognize";
  if (px >= 2) return "detect";
  return "none";
}

/**
 * NETD → noise amplitude for simulator (linear, higher NETD = more grain).
 * Reference: ≤20 clean, 25–35 medium, ≥50 heavy.
 * Also scales with fog and normalized distance (0 at 50 m, 1 at D).
 */
export function netdNoiseAmp(
  netdMk: number,
  fog: boolean,
  distanceM: number,
  detectionRangeM: number
): number {
  const base = (Math.max(netdMk, 12) / 30) * 28;
  const fogMul = fog ? 1.55 : 1;
  const t = Math.max(
    0,
    Math.min(1, (distanceM - 50) / Math.max(1, detectionRangeM - 50))
  );
  const distMul = 0.75 + 0.55 * t;
  return base * fogMul * distMul;
}

/**
 * NETD → contrast (lower NETD = sharper thermal contrast).
 */
export function netdContrast(netdMk: number, fog: boolean): number {
  const c = 42 / Math.max(netdMk, 15);
  return c * (fog ? 0.68 : 1);
}
