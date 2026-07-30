/**
 * Expert sandbox optics / Johnson DRI calculator.
 * Units: mm for optics, µm for pitch, m for range & target size.
 */

export type SandboxMatrix =
  | 160
  | 256
  | 384
  | 640
  | 1024
  | 1280;

export type PixelPitchUm = 17 | 12 | 10 | 8;

export type TargetKind = "human" | "deer" | "boar" | "fox";

export type SandboxInputs = {
  matrixW: SandboxMatrix;
  /** Vertical resolution (derived from typical aspect if not set). */
  matrixH: number;
  pitchUm: PixelPitchUm;
  netdMk: number;
  focalMm: number;
  target: TargetKind;
  distanceM: number;
  fog: boolean;
  /** Calibration vs real passports (RS75 human≈3900 m → K≈1.66). */
  kCalib: number;
};

export const MATRIX_PRESETS: {
  w: SandboxMatrix;
  h: number;
  label: string;
}[] = [
  { w: 160, h: 120, label: "160×120" },
  { w: 256, h: 192, label: "256×192" },
  { w: 384, h: 288, label: "384×288" },
  { w: 640, h: 512, label: "640×512" },
  { w: 1024, h: 768, label: "1024×768" },
  { w: 1280, h: 1024, label: "1280×1024" },
];

export const PITCH_OPTIONS: PixelPitchUm[] = [17, 12, 10, 8];

/** Critical target dimension (m) for Johnson line-pair count. */
export const TARGET_SIZE_M: Record<TargetKind, number> = {
  human: 0.75,
  deer: 1.0,
  boar: 0.7,
  fox: 0.3,
};

/** Standing / body height (m) for FOV angular size on screen. */
export const TARGET_VISUAL_HEIGHT_M: Record<TargetKind, number> = {
  human: 1.8,
  deer: 1.3,
  boar: 1.0,
  fox: 0.4,
};

export const TARGET_SUBJECT_SRC: Record<TargetKind, string> = {
  deer: "/thermal/deer_subject_whitehot.jpg",
  boar: "/thermal/subject_boar_whitehot.jpg",
  fox: "/thermal/subject_fox_whitehot.jpg",
  human: "/thermal/subject_human_whitehot.jpg",
};

export const INPUT_LIMITS = {
  netdMin: 10,
  netdMax: 60,
  focalMin: 13,
  focalMax: 100,
  distMin: 50,
  kMin: 0.5,
  kMax: 2.0,
  /** Default K: RS75 1280×1024 / 12µm / 75mm / human 0.75m → D_det≈3900 m */
  kDefault: 1.66,
} as const;

export const JOHNSON_N = {
  detect: 2,
  recognize: 8,
  identify: 13,
} as const;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function pitchMm(pitchUm: number): number {
  return pitchUm / 1000;
}

/** Horizontal sensor width (mm). */
export function sensorWidthMm(matrixW: number, pitchUm: number): number {
  return (pitchUm * matrixW) / 1000;
}

/** Horizontal FOV (degrees). */
export function fovHorizontalDeg(matrixW: number, pitchUm: number, focalMm: number): number {
  const f = Math.max(1, focalMm);
  const w = sensorWidthMm(matrixW, pitchUm);
  return (2 * Math.atan(w / (2 * f)) * 180) / Math.PI;
}

/** IFOV (mrad) ≈ pitch_µm / f_mm. */
export function ifovMrad(pitchUm: number, focalMm: number): number {
  return pitchUm / Math.max(1, focalMm);
}

/**
 * Pixels on target (critical dimension) at distance.
 * px = target_m × f_mm / (pitch_mm × dist_m)
 */
export function pixelsOnTargetOptics(
  targetSizeM: number,
  focalMm: number,
  pitchUm: number,
  distanceM: number
): number {
  const dist = Math.max(1, distanceM);
  const pmm = pitchMm(pitchUm);
  return (targetSizeM * focalMm) / (pmm * dist);
}

/**
 * Johnson range (m): D = K × target × f / (N × pitch_mm)
 * N = 2 detect / 8 recognize / 13 identify.
 */
export function johnsonRangeM(
  targetSizeM: number,
  focalMm: number,
  pitchUm: number,
  nPixels: number,
  kCalib: number
): number {
  const pmm = pitchMm(pitchUm);
  const k = clamp(kCalib, INPUT_LIMITS.kMin, INPUT_LIMITS.kMax);
  return (k * targetSizeM * focalMm) / (nPixels * pmm);
}

export type DriRanges = {
  detectM: number;
  recognizeM: number;
  identifyM: number;
};

export function computeDri(
  targetSizeM: number,
  focalMm: number,
  pitchUm: number,
  kCalib: number
): DriRanges {
  return {
    detectM: johnsonRangeM(
      targetSizeM,
      focalMm,
      pitchUm,
      JOHNSON_N.detect,
      kCalib
    ),
    recognizeM: johnsonRangeM(
      targetSizeM,
      focalMm,
      pitchUm,
      JOHNSON_N.recognize,
      kCalib
    ),
    identifyM: johnsonRangeM(
      targetSizeM,
      focalMm,
      pitchUm,
      JOHNSON_N.identify,
      kCalib
    ),
  };
}

export type DetectStatus = "identify" | "recognize" | "detect" | "none";

export function statusFromPixels(px: number, fog: boolean): DetectStatus {
  let p = px;
  if (fog) p *= 0.6;
  if (p >= JOHNSON_N.identify) return "identify";
  if (p >= JOHNSON_N.recognize) return "recognize";
  if (p >= JOHNSON_N.detect) return "detect";
  return "none";
}

export type SandboxComputed = {
  sensorWidthMm: number;
  fovDeg: number;
  ifovMrad: number;
  dri: DriRanges;
  /**
   * Clear-weather Johnson px (geometry / size). Fog must NOT shrink the sprite.
   */
  pixelsOnTargetClear: number;
  /** Effective px after fog×0.6 — for status badge and HUD readout. */
  pixelsOnTarget: number;
  status: DetectStatus;
  /** Hint when config is exotic / marketing-fantasy */
  atypical: boolean;
  atypicalReasons: string[];
};

export function clampSandboxInputs(raw: Partial<SandboxInputs>): SandboxInputs {
  const matrixW = (raw.matrixW ?? 640) as SandboxMatrix;
  const preset = MATRIX_PRESETS.find((m) => m.w === matrixW) || MATRIX_PRESETS[3];
  const pitchUm = (raw.pitchUm ?? 12) as PixelPitchUm;
  const netdMk = clamp(
    raw.netdMk ?? 35,
    INPUT_LIMITS.netdMin,
    INPUT_LIMITS.netdMax
  );
  const focalMm = clamp(
    raw.focalMm ?? 35,
    INPUT_LIMITS.focalMin,
    INPUT_LIMITS.focalMax
  );
  const target = raw.target ?? "deer";
  const kCalib = clamp(
    raw.kCalib ?? INPUT_LIMITS.kDefault,
    INPUT_LIMITS.kMin,
    INPUT_LIMITS.kMax
  );
  const size = TARGET_SIZE_M[target];
  const dri = computeDri(size, focalMm, pitchUm, kCalib);
  const distMax = Math.max(INPUT_LIMITS.distMin + 50, Math.round(dri.detectM));
  const distanceM = clamp(
    raw.distanceM ?? Math.min(400, distMax),
    INPUT_LIMITS.distMin,
    distMax
  );

  return {
    matrixW: preset.w,
    matrixH: preset.h,
    pitchUm: PITCH_OPTIONS.includes(pitchUm) ? pitchUm : 12,
    netdMk,
    focalMm,
    target,
    distanceM,
    fog: Boolean(raw.fog),
    kCalib,
  };
}

export function computeSandbox(inputs: SandboxInputs): SandboxComputed {
  const i = clampSandboxInputs(inputs);
  const size = TARGET_SIZE_M[i.target];
  const sensorW = sensorWidthMm(i.matrixW, i.pitchUm);
  const fovDeg = fovHorizontalDeg(i.matrixW, i.pitchUm, i.focalMm);
  const ifov = ifovMrad(i.pitchUm, i.focalMm);
  const dri = computeDri(size, i.focalMm, i.pitchUm, i.kCalib);
  const pxClear = pixelsOnTargetOptics(
    size,
    i.focalMm,
    i.pitchUm,
    i.distanceM
  );
  const status = statusFromPixels(pxClear, i.fog);

  const atypicalReasons: string[] = [];
  if (i.matrixW >= 1280 && i.pitchUm <= 8 && i.focalMm >= 75) {
    atypicalReasons.push("hi-res+fine-pitch+long-lens");
  }
  if (dri.detectM > 5000) {
    atypicalReasons.push("D_detect>5km");
  }
  if (i.matrixW >= 1024 && i.pitchUm <= 10 && i.focalMm >= 50) {
    atypicalReasons.push("premium-tier");
  }

  return {
    sensorWidthMm: sensorW,
    fovDeg,
    ifovMrad: ifov,
    dri,
    // Geometry always clear-weather; fog only demotes status / noise
    pixelsOnTargetClear: pxClear,
    pixelsOnTarget: i.fog ? pxClear * 0.6 : pxClear,
    status,
    atypical: atypicalReasons.length > 0 && dri.detectM > 3500,
    atypicalReasons,
  };
}

/**
 * Calibration check: RS75-class (1280×1024, 12µm, 75mm, human 0.75m).
 * Passport detection often cited ~3900 m → K ≈ 1.66 with formula above.
 */
export function calibrationRs75DetectM(k: number = INPUT_LIMITS.kDefault): number {
  return johnsonRangeM(0.75, 75, 12, JOHNSON_N.detect, k);
}

/** Offscreen pixelation width for sandbox matrices (visual grain). */
export function sandboxMatrixPixelWidth(matrixW: SandboxMatrix): number {
  if (matrixW >= 1280) return 320;
  if (matrixW >= 1024) return 288;
  if (matrixW >= 640) return 240;
  if (matrixW >= 384) return 144;
  if (matrixW >= 256) return 96;
  return 80;
}

export function sandboxMatrixPixelHeight(matrixW: SandboxMatrix): number {
  return Math.round(sandboxMatrixPixelWidth(matrixW) * (3 / 4));
}

/**
 * FOV-based target height fraction (same physics as PDP).
 * FOV_vert = 2×atan((pitch×H)/(2×f)); frac = (h/d)/FOV_vert
 */
export function sandboxOpticsHeightFrac(
  visualHeightM: number,
  distanceM: number,
  matrixH: number,
  pitchUm: number,
  focalMm: number,
  opticalMag = 1
): number {
  const f = Math.max(1, focalMm);
  const sensorH_mm = (Math.max(1, pitchUm) * Math.max(1, matrixH)) / 1000;
  const fovVert = 2 * Math.atan(sensorH_mm / (2 * f));
  const d = Math.max(1, distanceM);
  const angular = Math.max(0.05, visualHeightM) / d;
  const frac = (angular / Math.max(1e-6, fovVert)) * Math.max(0.25, opticalMag);
  return Math.max(0.004, Math.min(0.55, frac));
}

/** Same fade as PDP: past D_detect hot mark dies (status none ⇔ no pixels). */
export const SANDBOX_DETECT_FADE_PAST = 0.08;

export function sandboxSubjectVisibility(
  distanceM: number,
  detectRangeM: number,
  fog = false
): number {
  const D = Math.max(1, detectRangeM);
  const d = Math.max(1, distanceM);
  const Deff = fog ? D * 0.6 : D;
  if (d <= Deff) return 1;
  const fadeEnd = Deff * (1 + SANDBOX_DETECT_FADE_PAST);
  if (d >= fadeEnd) return 0;
  const u = (d - Deff) / (fadeEnd - Deff);
  return (1 - u) * (1 - u);
}

/**
 * FOV size + detect floor inside band; 0 past D (no ghost hot mark).
 */
export function sandboxRenderHeightFrac(
  visualHeightM: number,
  criticalSizeM: number,
  distanceM: number,
  matrixW: SandboxMatrix,
  matrixH: number,
  pitchUm: number,
  focalMm: number,
  /** Clear-weather Johnson px on critical (from optics formula) */
  johnsonPxClear: number,
  fog = false,
  /** Passport / computed detect range for fade past D */
  detectRangeM?: number
): number {
  const D = detectRangeM ?? Math.max(1, distanceM * (johnsonPxClear / 2));
  const vis = sandboxSubjectVisibility(distanceM, D, fog);
  if (vis <= 0) return 0;

  const fovFrac = sandboxOpticsHeightFrac(
    visualHeightM,
    distanceM,
    matrixH,
    pitchUm,
    focalMm,
    1
  );
  const grainH = sandboxMatrixPixelHeight(matrixW);
  const bodyGrain = fovFrac * grainH;
  const critGrain =
    bodyGrain * (criticalSizeM / Math.max(0.05, visualHeightM));

  let frac = fovFrac;
  if (johnsonPxClear >= JOHNSON_N.detect && critGrain < JOHNSON_N.detect) {
    const bodyNeed =
      (2.5 * visualHeightM) / Math.max(0.05, criticalSizeM);
    frac = Math.max(fovFrac, Math.min(0.1, bodyNeed / Math.max(1, grainH)));
  }
  if (vis < 1) frac *= vis;
  return frac;
}

/** Critical grain after render floor / fade — for status badge. */
export function sandboxRenderedCriticalGrain(
  visualHeightM: number,
  criticalSizeM: number,
  distanceM: number,
  matrixW: SandboxMatrix,
  matrixH: number,
  pitchUm: number,
  focalMm: number,
  johnsonPxClear: number,
  fog = false,
  detectRangeM?: number
): number {
  const hFrac = sandboxRenderHeightFrac(
    visualHeightM,
    criticalSizeM,
    distanceM,
    matrixW,
    matrixH,
    pitchUm,
    focalMm,
    johnsonPxClear,
    fog,
    detectRangeM
  );
  if (hFrac <= 0) return 0;
  const body = hFrac * sandboxMatrixPixelHeight(matrixW);
  const crit =
    body * (criticalSizeM / Math.max(0.05, visualHeightM));
  return fog ? crit * 0.6 : crit;
}

/**
 * @deprecated Prefer sandboxOpticsHeightFrac — size is FOV-based.
 */
export function sandboxTargetHeightFrac(
  pxOnTarget: number,
  matrixW: SandboxMatrix,
  logicH = 270
): number {
  const pixH = sandboxMatrixPixelHeight(matrixW);
  const frac = pxOnTarget / Math.max(1, pixH);
  return Math.max(1.2 / logicH, Math.min(0.82, frac));
}
