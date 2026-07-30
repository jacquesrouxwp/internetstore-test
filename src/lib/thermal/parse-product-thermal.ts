/**
 * Extract thermal simulator inputs from product fields / specs.
 * Detection status uses Johnson criteria (2 / 8 / 13 pixels on target).
 *
 * Visual deer size is calibrated so that after matrix pixelation the target
 * height on the sensor ≈ Johnson pixel count — badge and picture stay in sync.
 */

export type ThermalMatrix = 256 | 384 | 640;

export type ThermalProductInput = {
  resolution?: string | null;
  detectionRangeM?: number | null;
  specs?: Record<string, string> | null;
  /** Display label only — never used to parse matrix. */
  name?: string;
};

export type ThermalSimParams = {
  matrix: ThermalMatrix;
  /** Passport detection range D (m) — Johnson calibration anchor */
  detectionRangeM: number;
  netdMk: number;
  refreshRateHz: number | null;
  label: string;
};

export type ThermalCompareOption = {
  id: string;
  slug: string;
  name: string;
  matrix: ThermalMatrix;
  detectionRangeM: number;
  netdMk: number;
  refreshRateHz: number | null;
};

/** Johnson thresholds (line-pairs / critical dimension on target). */
export const JOHNSON_PX = {
  /** ≥13 → identification (details) */
  identify: 13,
  /** ≥8 → recognition (animal class) */
  recognize: 8,
  /** ≥2 → detection (something is there); = 2 at dist = D */
  detect: 2,
} as const;

export function defaultDetectionRangeM(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 2350;
  if (matrix >= 384) return 1600;
  return 1050;
}

export function defaultNetdMk(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 25;
  if (matrix >= 384) return 35;
  return 40;
}

export function matrixClassPreset(matrix: ThermalMatrix): ThermalSimParams {
  return {
    matrix,
    detectionRangeM: defaultDetectionRangeM(matrix),
    netdMk: defaultNetdMk(matrix),
    refreshRateHz: 50,
    label: `${matrix}×${matrix === 640 ? 512 : matrix === 384 ? 288 : 192}`,
  };
}

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
    if (specs["Матриця"]) specParts.push(specs["Матриця"]);
    if (specs["Матрица"]) specParts.push(specs["Матрица"]);
    if (specs["Resolution"]) specParts.push(specs["Resolution"]);
  }
  const raw = specParts.join(" ");

  if (/640\s*[x×]\s*512/i.test(raw)) return 640;
  if (/384\s*[x×]\s*288/i.test(raw)) return 384;
  if (/256\s*[x×]\s*192/i.test(raw)) return 256;
  if (/160\s*[x×]\s*120/i.test(raw)) return 256;

  if (/(?:^|[^\d])640(?:[^\d]|$)/.test(raw) && /512|matrix|матриц/i.test(raw))
    return 640;
  if (/(?:^|[^\d])384(?:[^\d]|$)/.test(raw)) return 384;
  if (/(?:^|[^\d])256(?:[^\d]|$)/.test(raw)) return 256;

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
 * Offscreen width for matrix pixelation (sensor simulation).
 * 256 → large blocks, 384 → medium, 640 → fine.
 */
export function matrixPixelWidth(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 240;
  if (matrix >= 384) return 144;
  return 96;
}

/** Sensor height for 4:3 logical frame (matches real thermal sensors / canvas). */
export function matrixPixelHeight(matrix: ThermalMatrix): number {
  return Math.round(matrixPixelWidth(matrix) * (3 / 4));
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
 * Johnson: pixels on target at distance.
 * At dist = D → exactly 2 px (detection limit of passport range).
 */
export function pixelsOnTarget(distanceM: number, detectionRangeM: number): number {
  const dist = Math.max(distanceM, 1);
  const D = Math.max(detectionRangeM, 1);
  return (2 * D) / dist;
}

/** Fog reduces effective resolution on target (atmospheric attenuation). */
export function effectivePixelsOnTarget(
  distanceM: number,
  detectionRangeM: number,
  fog = false
): number {
  let px = pixelsOnTarget(distanceM, detectionRangeM);
  if (fog) px *= 0.6;
  return px;
}

/**
 * Status from Johnson pixel count (calibrated to passport D).
 * NETD does not change status (noise only). Matrix does not change status
 * (grain only) — but visual size uses matrix so blocks match px count.
 */
export function computeDetectStatus(opts: {
  distanceM: number;
  maxRangeM: number;
  matrix?: ThermalMatrix;
  netdMk?: number;
  fog?: boolean;
}): DetectStatus {
  const px = effectivePixelsOnTarget(
    opts.distanceM,
    opts.maxRangeM,
    opts.fog ?? false
  );
  if (px >= JOHNSON_PX.identify) return "identify";
  if (px >= JOHNSON_PX.recognize) return "recognize";
  if (px >= JOHNSON_PX.detect) return "detect";
  return "none";
}

/**
 * Max distance (m) for each status band (clear weather).
 * identify: dist ≤ 2D/13 ≈ D/6.5
 * recognize: dist ≤ 2D/8 = D/4
 * detect: dist ≤ D
 */
export function johnsonBandDistancesM(detectionRangeM: number): {
  identifyMaxM: number;
  recognizeMaxM: number;
  detectMaxM: number;
} {
  const D = Math.max(1, detectionRangeM);
  return {
    identifyMaxM: Math.round((2 * D) / JOHNSON_PX.identify),
    recognizeMaxM: Math.round((2 * D) / JOHNSON_PX.recognize),
    detectMaxM: Math.round(D),
  };
}

/**
 * Deer height as fraction of logic frame height so that AFTER matrix
 * downscale the target height ≈ effective Johnson pixels.
 *
 *   frac * logicH * (pixH/logicH) = px  →  frac = px / pixH
 */
export function johnsonDeerHeightFrac(
  distanceM: number,
  detectionRangeM: number,
  matrix: ThermalMatrix,
  fog = false,
  logicH = 360
): number {
  const pixH = matrixPixelHeight(matrix);
  const px = effectivePixelsOnTarget(distanceM, detectionRangeM, fog);
  // At least ~1 logic pixel worth; at most 82% frame (antlers fit)
  const frac = px / Math.max(1, pixH);
  const minFrac = 1.2 / logicH;
  return Math.max(minFrac, Math.min(0.82, frac));
}

/** Human-readable explanation of current status (uk/ru via caller). */
export function statusMeaningKey(status: DetectStatus): string {
  return status;
}

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

export function netdContrast(netdMk: number, fog: boolean): number {
  const c = 42 / Math.max(netdMk, 15);
  return c * (fog ? 0.68 : 1);
}
