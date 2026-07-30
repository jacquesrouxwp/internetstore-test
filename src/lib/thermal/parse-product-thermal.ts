/**
 * Extract thermal simulator inputs from product fields / specs.
 * Detection status uses Johnson criteria (2 / 8 / 13 pixels on target).
 *
 * Visible target size is FOV-based (optics), not a free “fill the frame” scale:
 *   frame_height_frac = (visualHeight / distance) / FOV_vert × opticalMag
 * Status still follows passport D; at long range both picture and badge → hot spot.
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
  /** Lens focal length (mm) when known — drives vertical FOV for size */
  focalMm: number | null;
  /** Pixel pitch (µm); default 12 when only focal is known */
  pitchUm: number | null;
};

export type ThermalCompareOption = {
  id: string;
  slug: string;
  name: string;
  matrix: ThermalMatrix;
  detectionRangeM: number;
  netdMk: number;
  refreshRateHz: number | null;
  focalMm: number | null;
  pitchUm: number | null;
};

/** Typical vertical FOV when lens not in product card (~10–12°). */
export const DEFAULT_FOV_VERT_DEG = 11;

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

/** Real sensor vertical pixel count for FOV (not offscreen grain height). */
export function matrixVertPixels(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 512;
  if (matrix >= 384) return 288;
  return 192;
}

export function matrixClassPreset(matrix: ThermalMatrix): ThermalSimParams {
  // Typical mid-class lens by matrix for demos when no product optics
  const focalMm = matrix >= 640 ? 35 : matrix >= 384 ? 25 : 19;
  return {
    matrix,
    detectionRangeM: defaultDetectionRangeM(matrix),
    netdMk: defaultNetdMk(matrix),
    refreshRateHz: 50,
    label: `${matrix}×${matrix === 640 ? 512 : matrix === 384 ? 288 : 192}`,
    focalMm,
    pitchUm: 12,
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
 * Focal length (mm) from specs / model name (e.g. "Об'єктив 35 мм", "LE15", "f=25").
 */
export function parseFocalMm(
  specs?: Record<string, string> | null,
  name?: string | null
): number | null {
  const chunks: string[] = [];
  if (specs) {
    for (const [k, v] of Object.entries(specs)) {
      if (
        /фокус|focal|объект|об'єкт|об'єктив|лінз|линз|lens|objective|оптик|f\b/i.test(
          k
        )
      ) {
        chunks.push(String(v));
      }
      // bare "25 мм" values on lens-ish keys already covered; also scan values
      if (/\d{1,3}\s*мм/i.test(String(v)) && /мм|mm|focal|линз|лінз|объект/i.test(k + v)) {
        chunks.push(`${k} ${v}`);
      }
    }
  }
  if (name) chunks.push(name);

  const text = chunks.join(" | ");
  const patterns = [
    /(?:f|ф)\s*[=:]?\s*(\d{1,3})\s*(?:мм|mm)?/i,
    /(\d{1,3})\s*(?:мм|mm)/i,
    /(?:LE|LH|LQ|CQ|TL|TR)\s*(\d{2,3})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 9 && n <= 150) return n;
    }
  }
  return null;
}

/** Pixel pitch µm from specs (12 / 17 / 10 / 8). */
export function parsePitchUm(
  specs?: Record<string, string> | null
): number | null {
  if (!specs) return null;
  for (const [k, v] of Object.entries(specs)) {
    if (/pitch|піксель|пиксель|мкм|µm|um\b/i.test(k + " " + v)) {
      const m = String(v).match(/\b(17|12|10|8)\b/);
      if (m) return Number(m[1]);
    }
  }
  return null;
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

/**
 * FOV_vert (rad) = 2 × atan( (pitch_µm × vert_px / 1000) / (2 × f_mm) )
 */
export function fovVerticalRadFromOptics(
  matrixVertPx: number,
  pitchUm: number,
  focalMm: number
): number {
  const f = Math.max(1, focalMm);
  const sensorH_mm = (Math.max(1, pitchUm) * Math.max(1, matrixVertPx)) / 1000;
  return 2 * Math.atan(sensorH_mm / (2 * f));
}

export function resolveFovVerticalRad(opts: {
  matrix: ThermalMatrix;
  focalMm?: number | null;
  pitchUm?: number | null;
  /** Override degrees if product quotes FOV directly */
  fovVertDeg?: number | null;
}): number {
  if (opts.fovVertDeg != null && Number.isFinite(opts.fovVertDeg) && opts.fovVertDeg > 0) {
    return (opts.fovVertDeg * Math.PI) / 180;
  }
  const f = opts.focalMm;
  if (f != null && Number.isFinite(f) && f > 0) {
    const pitch = opts.pitchUm != null && opts.pitchUm > 0 ? opts.pitchUm : 12;
    return fovVerticalRadFromOptics(matrixVertPixels(opts.matrix), pitch, f);
  }
  return (DEFAULT_FOV_VERT_DEG * Math.PI) / 180;
}

/**
 * Frame height fraction from real angular size vs instrument FOV.
 *   angular ≈ height_m / distance_m   (rad, small-angle)
 *   frac = (angular / FOV_vert) × opticalMag
 *
 * Fog must NOT change this. Digi-zoom is applied later as a crop.
 */
export function targetFrameHeightFrac(
  visualHeightM: number,
  distanceM: number,
  fovVertRad: number,
  opticalMag = 1
): number {
  const d = Math.max(1, distanceM);
  const h = Math.max(0.05, visualHeightM);
  const fov = Math.max(1e-6, fovVertRad);
  const mag = Math.max(0.25, opticalMag);
  const angular = h / d;
  const frac = (angular / fov) * mag;
  // Soft clamps: never full-screen hero; never invisible (1–2 logic px min)
  return Math.max(0.004, Math.min(0.55, frac));
}

/**
 * Convenience: height frac for a product panel + target visual height.
 */
export function opticsTargetHeightFrac(
  visualHeightM: number,
  distanceM: number,
  params: Pick<ThermalSimParams, "matrix" | "focalMm" | "pitchUm">,
  opticalMag = 1
): number {
  const fov = resolveFovVerticalRad({
    matrix: params.matrix,
    focalMm: params.focalMm,
    pitchUm: params.pitchUm,
  });
  return targetFrameHeightFrac(visualHeightM, distanceM, fov, opticalMag);
}

export function parseProductThermal(p: ThermalProductInput): ThermalSimParams {
  const matrix = parseMatrix(p.resolution, p.specs);
  return {
    matrix,
    detectionRangeM: parseRange(p.detectionRangeM, p.specs, matrix),
    netdMk: parseNetd(p.specs),
    refreshRateHz: parseRefresh(p.specs),
    label: p.name || "Thermal",
    focalMm: parseFocalMm(p.specs, p.name),
    pitchUm: parsePitchUm(p.specs),
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
    focalMm: sim.focalMm,
    pitchUm: sim.pitchUm,
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
 * @deprecated Use opticsTargetHeightFrac — size is FOV-based, not Johnson-forced.
 * Kept for call sites/tests that still pass detectionRange + matrix only.
 * Uses default FOV when optics unknown; ignores detectionRange for size.
 */
export function johnsonDeerHeightFrac(
  distanceM: number,
  _detectionRangeM: number,
  matrix: ThermalMatrix,
  fog = false,
  _logicH = 360,
  visualHeightM = 1.3
): number {
  void fog;
  void _detectionRangeM;
  void _logicH;
  return opticsTargetHeightFrac(
    visualHeightM,
    distanceM,
    { matrix, focalMm: null, pitchUm: null },
    1
  );
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
