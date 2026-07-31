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
  /** Retail price (UAH) — feeds Value-for-Money in A/B scores. */
  price?: number | null;
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
  /** Retail price (UAH) for Value-for-Money; null when unknown. */
  priceUah?: number | null;
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
  priceUah: number | null;
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

/** Alias used by A/B scoring layer (same 2 / 8 / 13). */
export const JOHNSON = JOHNSON_PX;

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

/**
 * Typical street price (UAH) by matrix class — Value-for-Money fallback for
 * class presets / demos when product price is unknown.
 */
export function defaultPriceUah(matrix: ThermalMatrix): number {
  if (matrix >= 640) return 120000;
  if (matrix >= 384) return 60000;
  return 28000;
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
    priceUah: defaultPriceUah(matrix),
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
    // Hikmicro / Pard style: LE15, LH35, CQ50L, FQ50, HQ50, H50R, XG30, 640-50
    /(?:LE|LH|LQ|CQ|FQ|HQ|TL|TR|XG)\s*(\d{2,3})/i,
    /\bH\s*(\d{2})R?\b/i,
    /(\d{3})\s*[-–]\s*(\d{2})\b/, // 640-50 → 50
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      // last capture is focal when 640-50
      const n = Number(m[m.length - 1]);
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

/** Body height on matrix-grain after pixelation (what the canvas resolves). */
export function visualBodyGrainPx(
  visualHeightM: number,
  distanceM: number,
  params: Pick<ThermalSimParams, "matrix" | "focalMm" | "pitchUm">
): number {
  return (
    opticsTargetHeightFrac(visualHeightM, distanceM, params, 1) *
    matrixPixelHeight(params.matrix)
  );
}

/**
 * Critical dimension on grain (Johnson status must use THIS — not passport alone).
 * critical ≈ body × (criticalSize / visualHeight)
 */
export function visualCriticalGrainPx(
  visualHeightM: number,
  criticalSizeM: number,
  distanceM: number,
  params: Pick<ThermalSimParams, "matrix" | "focalMm" | "pitchUm">,
  fog = false
): number {
  const body = visualBodyGrainPx(visualHeightM, distanceM, params);
  const ratio = criticalSizeM / Math.max(0.05, visualHeightM);
  let px = body * ratio;
  if (fog) px *= 0.6;
  return px;
}

/**
 * Min body height fraction so critical dimension ≈ DETECT_GRAIN_MIN after grain.
 * Used only when passport claims detect but FOV projects a sub-pixel (invisible).
 */
export const DETECT_GRAIN_MIN = 2.5;

/**
 * How far past passport D the hot mark is allowed to linger (fraction of D).
 * Example: D=1200 → fully gone by ~1296 m (not still glowing at 1300).
 */
export const DETECT_FADE_PAST_D = 0.08;

export function detectFloorHeightFrac(
  visualHeightM: number,
  criticalSizeM: number,
  matrix: ThermalMatrix
): number {
  const grainH = matrixPixelHeight(matrix);
  const bodyNeed =
    (DETECT_GRAIN_MIN * visualHeightM) / Math.max(0.05, criticalSizeM);
  // Cap: never force more than ~10% frame just for a detect blob
  return Math.min(0.1, bodyNeed / Math.max(1, grainH));
}

/**
 * Subject visibility vs passport detection limit.
 * 1 for d ≤ D (and clear-weather detect band); ramps to 0 over DETECT_FADE_PAST_D.
 * Fog shortens the effective band (same ×0.6 as Johnson status).
 *
 * This is the fix for: status "none" at 1300 m while yellow pixels still lit at 1200 size.
 */
export function targetSubjectVisibility(
  distanceM: number,
  detectionRangeM: number,
  fog = false
): number {
  const D = Math.max(1, detectionRangeM);
  const d = Math.max(1, distanceM);
  // Fog: effective detect range ≈ D × 0.6 (px ×0.6 → need closer for 2 px)
  const Deff = fog ? D * 0.6 : D;

  if (d <= Deff) return 1;

  const fadeEnd = Deff * (1 + DETECT_FADE_PAST_D);
  if (d >= fadeEnd) return 0;

  const u = (d - Deff) / (fadeEnd - Deff); // 0 at Deff → 1 at fadeEnd
  // Smooth ease-out: stays a faint ghost briefly, then gone
  return (1 - u) * (1 - u);
}

/**
 * Draw height: FOV-honest at normal ranges; detect floor inside band;
 * **zero past fade** so "не виявлено" has no hot mark.
 */
export function renderTargetHeightFrac(
  visualHeightM: number,
  criticalSizeM: number,
  distanceM: number,
  detectionRangeM: number,
  params: Pick<ThermalSimParams, "matrix" | "focalMm" | "pitchUm">,
  fog = false
): number {
  const vis = targetSubjectVisibility(distanceM, detectionRangeM, fog);
  if (vis <= 0) return 0;

  const fovFrac = opticsTargetHeightFrac(
    visualHeightM,
    distanceM,
    params,
    1
  );
  const passPx = pixelsOnTarget(distanceM, detectionRangeM);
  const critFov = visualCriticalGrainPx(
    visualHeightM,
    criticalSizeM,
    distanceM,
    params,
    false
  );

  let frac = fovFrac;

  // Inside clear-weather detect band: ensure visible hot mark if FOV sub-pixel
  if (passPx >= JOHNSON_PX.detect && critFov < JOHNSON_PX.detect) {
    frac = Math.max(
      fovFrac,
      detectFloorHeightFrac(visualHeightM, criticalSizeM, params.matrix)
    );
  }

  // Past D: shrink with visibility so we don't leave a full detect blob while fading
  if (vis < 1) {
    frac *= vis;
  }

  return frac;
}

/**
 * Status from drawn pixels. Past D (vis=0) → always none — no "ghost detect".
 */
export function computeDetectStatusVisual(opts: {
  visualHeightM: number;
  criticalSizeM: number;
  distanceM: number;
  detectionRangeM: number;
  matrix: ThermalMatrix;
  focalMm: number | null;
  pitchUm: number | null;
  fog?: boolean;
}): DetectStatus {
  const fog = opts.fog ?? false;
  const vis = targetSubjectVisibility(
    opts.distanceM,
    opts.detectionRangeM,
    fog
  );
  if (vis <= 0) return "none";

  const hFrac = renderTargetHeightFrac(
    opts.visualHeightM,
    opts.criticalSizeM,
    opts.distanceM,
    opts.detectionRangeM,
    opts,
    fog
  );
  if (hFrac <= 0) return "none";

  const bodyGrain = hFrac * matrixPixelHeight(opts.matrix);
  const critGrain =
    bodyGrain *
    (opts.criticalSizeM / Math.max(0.05, opts.visualHeightM)) *
    (fog ? 0.6 : 1);

  if (critGrain >= JOHNSON_PX.identify) return "identify";
  if (critGrain >= JOHNSON_PX.recognize) return "recognize";
  if (critGrain >= JOHNSON_PX.detect) return "detect";
  return "none";
}

/** Effective critical grain after render floor / fade (for HUD). */
export function renderedCriticalGrainPx(
  visualHeightM: number,
  criticalSizeM: number,
  distanceM: number,
  detectionRangeM: number,
  params: Pick<ThermalSimParams, "matrix" | "focalMm" | "pitchUm">,
  fog = false
): number {
  const hFrac = renderTargetHeightFrac(
    visualHeightM,
    criticalSizeM,
    distanceM,
    detectionRangeM,
    params,
    fog
  );
  if (hFrac <= 0) return 0;
  const body = hFrac * matrixPixelHeight(params.matrix);
  const crit =
    body * (criticalSizeM / Math.max(0.05, visualHeightM));
  return fog ? crit * 0.6 : crit;
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
    priceUah:
      p.price != null && Number.isFinite(p.price) && p.price > 0
        ? Math.round(p.price)
        : null,
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
    priceUah: sim.priceUah ?? null,
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
  /** Relative target size (1 = passport ref); <1 smaller animal. */
  targetFactor?: number;
}): DetectStatus {
  let px = pixelsOnTarget(opts.distanceM, opts.maxRangeM);
  if (opts.targetFactor != null && Number.isFinite(opts.targetFactor)) {
    px *= opts.targetFactor;
  }
  if (opts.fog) px *= 0.6;
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
