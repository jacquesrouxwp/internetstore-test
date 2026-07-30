"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeDetectStatus,
  defaultDetectionRangeM,
  effectivePixelsOnTarget,
  johnsonBandDistancesM,
  opticsTargetHeightFrac,
  resolveFovVerticalRad,
  JOHNSON_PX,
  matrixClassPreset,
  matrixPixelHeight,
  matrixPixelWidth,
  netdContrast,
  netdNoiseAmp,
  type DetectStatus,
  type ThermalCompareOption,
  type ThermalMatrix,
  type ThermalSimParams,
} from "@/lib/thermal/parse-product-thermal";
import {
  atmosphericTransmission,
  deerScreenRect,
  defaultSimDistanceM,
  DIGI_ZOOM_STEPS,
  digitalZoomCrop,
  DIST_MIN_M,
  inspectDigiZoom,
  nextDigiZoom,
} from "@/lib/thermal/zoom";
import {
  THERMAL_TARGETS,
  detectionRangeForTarget,
  getThermalTarget,
  type ThermalTargetId,
} from "@/lib/thermal/targets";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/types";

type Palette = "whitehot" | "ironhot";
type Weather = "clear" | "fog";

/**
 * Two-layer perspective:
 *  - Forest: fixed FOV (instrument field of view does not change)
 *  - Deer: real sprite, height ∝ 1/d, feet on ground plane ∝ 1/d
 * Frame: 4:3 (real thermal sensors). Ocular devices get round FOV + optional reticle.
 */
export type ThermalScene = {
  id: string;
  labelUk: string;
  labelRu: string;
  forest: string;
  deer: string;
};

const SCENES: ThermalScene[] = [
  {
    id: "deer",
    labelUk: "Олень у лісі",
    labelRu: "Олень в лесу",
    forest: "/thermal/forest_whitehot.jpg",
    deer: "/thermal/deer_subject_whitehot.jpg",
  },
];

/** 4:3 — matches 384×288 / 640×512 class sensors */
const LOGIC_W = 480;
const LOGIC_H = 360;
const SPRITE_S = 512;

/** Exactly two windows when comparing: this product + one peer. */
type PanelKey = "current" | "compare";

/** Ocular = round FOV; screen = rectangular 4:3 display. */
export type ThermalViewForm = "ocular" | "screen";

export function thermalViewFormFromDevice(
  deviceType?: DeviceType | string | null
): ThermalViewForm {
  // Scope / binocular / clip-on / classic monocular → look through an eyepiece
  if (
    deviceType === "scope" ||
    deviceType === "binocular" ||
    deviceType === "clipon"
  ) {
    return "ocular";
  }
  // Default mono → many modern units are screen monoculars (rect 4:3)
  // Opt-in ocular mono via "ocular" string if needed later
  if (deviceType === "ocular" || deviceType === "eyepiece") return "ocular";
  return "screen";
}

type Props = {
  params: ThermalSimParams;
  locale?: string;
  compareOptions?: ThermalCompareOption[];
  currentProductId?: string;
  allowMatrixPick?: boolean;
  sceneId?: string;
  className?: string;
  /** Product form factor — drives round vs rect frame + reticle */
  deviceType?: DeviceType | string | null;
};

const STATUS_UK: Record<DetectStatus, string> = {
  identify: "Ідентифікація",
  recognize: "Розпізнавання",
  detect: "Виявлення",
  none: "Не видно",
};
const STATUS_RU: Record<DetectStatus, string> = {
  identify: "Идентификация",
  recognize: "Распознавание",
  detect: "Обнаружение",
  none: "Не видно",
};

/** Short meaning under the badge */
const STATUS_HINT_UK: Record<DetectStatus, string> = {
  identify: "видно деталі (≥13 px на цілі)",
  recognize: "зрозуміло, що тварина (≥8 px)",
  detect: "видно, що щось є (≥2 px)",
  none: "менше 2 px — ціль зливається з шумом",
};
const STATUS_HINT_RU: Record<DetectStatus, string> = {
  identify: "видны детали (≥13 px на цели)",
  recognize: "понятно, что животное (≥8 px)",
  detect: "видно, что что-то есть (≥2 px)",
  none: "меньше 2 px — цель тонет в шуме",
};

const STATUS_COLOR: Record<DetectStatus, string> = {
  identify: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  recognize: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  detect: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  none: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(...parts: (string | number | boolean)[]): number {
  const s = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ironLut(v: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.25) {
    const k = t / 0.25;
    return [
      Math.round(20 + k * 40),
      Math.round(10 + k * 20),
      Math.round(40 + k * 120),
    ];
  }
  if (t < 0.5) {
    const k = (t - 0.25) / 0.25;
    return [
      Math.round(60 + k * 140),
      Math.round(30 + k * 40),
      Math.round(160 - k * 100),
    ];
  }
  if (t < 0.75) {
    const k = (t - 0.5) / 0.25;
    return [
      Math.round(200 + k * 55),
      Math.round(70 + k * 120),
      Math.round(60 - k * 40),
    ];
  }
  const k = (t - 0.75) / 0.25;
  return [255, Math.round(190 + k * 65), Math.round(20 + k * 200)];
}

/**
 * Vegetation is cold in real thermals. Remap forest luminance into the cold
 * band so canopy highlights never hit hot iron/white tones.
 * Subject (deer) uses full [0..1] → full LUT.
 */
const FOREST_LUMA_SCALE = 0.32;
const FOREST_LUMA_MAX = 0.38;

function lumaOf(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Apply palette to ImageData. mode "cold" = forest; "hot" = animal (full range). */
function applyThermalPalette(
  data: Uint8ClampedArray,
  palette: Palette,
  mode: "cold" | "hot",
  /** Only touch pixels with alpha > threshold (deer layer). */
  respectAlpha = false
) {
  for (let i = 0; i < data.length; i += 4) {
    if (respectAlpha && data[i + 3] < 8) continue;
    let L = lumaOf(data[i], data[i + 1], data[i + 2]) / 255;
    if (mode === "cold") {
      L = Math.min(FOREST_LUMA_MAX, L * FOREST_LUMA_SCALE);
    }
    // mild subject stretch keeps body heat readable
    if (mode === "hot") {
      L = Math.pow(Math.max(0, Math.min(1, L)), 0.92);
    }
    if (palette === "whitehot") {
      const y = Math.round(L * 255);
      data[i] = data[i + 1] = data[i + 2] = y;
    } else {
      const [rr, gg, bb] = ironLut(L);
      data[i] = rr;
      data[i + 1] = gg;
      data[i + 2] = bb;
    }
    if (!respectAlpha) data[i + 3] = 255;
  }
}

/** Cover forest, biased to show ground litter (bottom of source). */
function drawForestCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const syMax = Math.max(0, ih - sh);
  const sy = Math.min(syMax, syMax * 0.78);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

/**
 * Black corners + circular FOV (eyepiece). Soft falloff at rim.
 * Scope reticle: mild mil-dot style cross.
 */
function applyDeviceFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  form: ThermalViewForm,
  withScopeReticle: boolean
) {
  const cx = w / 2;
  const cy = h / 2;

  if (form === "ocular") {
    const r = Math.min(w, h) * 0.48;
    // Even-odd: full rect minus circle → black outside FOV
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.fillStyle = "#000000";
    ctx.fill("evenodd");

    // Soft edge inside the circle
    const edge = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
    edge.addColorStop(0, "rgba(0,0,0,0)");
    edge.addColorStop(0.65, "rgba(0,0,0,0)");
    edge.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = edge;
    ctx.fill();

    // Thin bright ring (lens rim)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,185,195,0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    if (withScopeReticle) {
      drawScopeReticle(ctx, cx, cy, r * 0.78);
    }
  } else {
    // Screen mono: rectangular 4:3 with mild edge vignette only
    const grd = ctx.createRadialGradient(
      cx,
      cy,
      h * 0.32,
      cx,
      cy,
      h * 0.72
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    // Bezel
    ctx.strokeStyle = "rgba(40,44,52,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  }
}

function drawScopeReticle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  arm: number
) {
  ctx.save();
  ctx.strokeStyle = "rgba(225, 50, 50, 0.55)";
  ctx.lineWidth = 1;
  // Cross
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();
  // Center gap
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx + 5, cy);
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx, cy + 5);
  ctx.stroke();
  // Mild mil ticks
  ctx.strokeStyle = "rgba(225, 50, 50, 0.4)";
  ctx.lineWidth = 1;
  const step = arm / 5;
  for (let i = 1; i <= 4; i++) {
    const t = step * i;
    const tick = 4;
    ctx.beginPath();
    ctx.moveTo(cx + t, cy - tick);
    ctx.lineTo(cx + t, cy + tick);
    ctx.moveTo(cx - t, cy - tick);
    ctx.lineTo(cx - t, cy + tick);
    ctx.moveTo(cx - tick, cy + t);
    ctx.lineTo(cx + tick, cy + t);
    ctx.moveTo(cx - tick, cy - t);
    ctx.lineTo(cx + tick, cy - t);
    ctx.stroke();
  }
  ctx.restore();
}

/** HUD along frame edge — inside circle for ocular, top-left for screen. */
function drawDeviceHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  form: ThermalViewForm,
  lines: { text: string; color: string }[]
) {
  ctx.save();
  ctx.font = "600 11px Manrope, system-ui, sans-serif";
  if (form === "ocular") {
    const r = Math.min(w, h) * 0.48;
    const cx = w / 2;
    const cy = h / 2;
    // Arc of text near bottom-left inside circle
    let y = cy + r * 0.42;
    const x = cx - r * 0.62;
    for (const line of lines) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(line.text, x + 1, y + 1);
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, x, y);
      y += 14;
    }
  } else {
    let y = 18;
    const x = 12;
    for (const line of lines) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillText(line.text, x + 1, y + 1);
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, x, y);
      y += 15;
    }
  }
  ctx.restore();
}

function drawGroundContact(
  ctx: CanvasRenderingContext2D,
  cx: number,
  feetY: number,
  deerW: number,
  trans: number
) {
  const rx = Math.max(3, deerW * 0.55);
  const ry = Math.max(2, deerW * 0.14);

  const shadow = ctx.createRadialGradient(cx, feetY, 0, cx, feetY, rx);
  shadow.addColorStop(0, `rgba(4, 6, 10, ${0.75 * trans})`);
  shadow.addColorStop(0.5, `rgba(8, 10, 14, ${0.32 * trans})`);
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cool contact only — no warm bloom (ground stays cold)
  const cool = ctx.createRadialGradient(cx, feetY, 0, cx, feetY, rx * 0.45);
  cool.addColorStop(0, `rgba(12, 14, 22, ${0.4 * trans})`);
  cool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cool;
  ctx.beginPath();
  ctx.ellipse(cx, feetY, rx * 0.45, ry * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
}

type DeerSprite = {
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  aspect: number;
};

/** Luma-key deer on black; crop to solid body; feet = bottom of content. */
function buildDeerSprite(img: HTMLImageElement): DeerSprite | null {
  const c = document.createElement("canvas");
  c.width = SPRITE_S;
  c.height = SPRITE_S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, SPRITE_S, SPRITE_S);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, SPRITE_S, SPRITE_S);

  const id = ctx.getImageData(0, 0, SPRITE_S, SPRITE_S);
  const d = id.data;
  const lo = 18;
  const hi = 70;
  let minX = SPRITE_S;
  let maxX = 0;
  let minY = SPRITE_S;
  let maxY = 0;

  for (let y = 0; y < SPRITE_S; y++) {
    for (let x = 0; x < SPRITE_S; x++) {
      const i = (y * SPRITE_S + x) * 4;
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let t = (l - lo) / (hi - lo);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const a = t * t * (3 - 2 * t);
      d[i] = d[i + 1] = d[i + 2] = l;
      d[i + 3] = Math.round(a * 255);
      if (a > 0.45) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(id, 0, 0);
  if (maxX <= minX || maxY <= minY) return null;

  // Bottom = hooves (lowest solid row)
  let feetY = maxY;
  for (let y = maxY; y >= minY; y--) {
    let solid = 0;
    for (let x = minX; x <= maxX; x++) {
      if (d[(y * SPRITE_S + x) * 4 + 3] > 150) solid++;
    }
    if (solid >= 2) {
      feetY = y;
      break;
    }
  }

  const cw = maxX - minX + 1;
  const ch = feetY - minY + 1;
  return {
    canvas: c,
    cx: minX,
    cy: minY,
    cw,
    ch,
    aspect: cw / Math.max(1, ch),
  };
}

function optionToParams(o: ThermalCompareOption): ThermalSimParams {
  return {
    matrix: o.matrix,
    detectionRangeM: o.detectionRangeM,
    netdMk: o.netdMk,
    refreshRateHz: o.refreshRateHz,
    label: o.name,
    focalMm: o.focalMm ?? null,
    pitchUm: o.pitchUm ?? null,
  };
}

function resolveCompareSelection(
  optionId: string,
  catalog: ThermalCompareOption[],
  isRu: boolean
): ThermalSimParams | null {
  if (!optionId) return null;
  if (optionId.startsWith("preset:")) {
    const m = Number(optionId.replace("preset:", "")) as ThermalMatrix;
    const preset = matrixClassPreset(m);
    return {
      ...preset,
      label:
        (isRu ? "Класс " : "Клас ") +
        preset.label +
        (isRu ? " (типовой)" : " (типовий)"),
    };
  }
  const opt = catalog.find((c) => c.id === optionId);
  return opt ? optionToParams(opt) : null;
}

export function ThermalSimulator({
  params,
  locale = "uk",
  compareOptions: compareOptionsProp,
  currentProductId,
  allowMatrixPick = false,
  sceneId = "deer",
  className,
  deviceType = "mono",
}: Props) {
  const isRu = locale === "ru";
  const scene = SCENES.find((s) => s.id === sceneId) || SCENES[0];
  const viewForm = thermalViewFormFromDevice(deviceType);
  const withScopeReticle = deviceType === "scope" || deviceType === "clipon";

  const [distance, setDistance] = useState(() =>
    defaultSimDistanceM(params.detectionRangeM || 1200)
  );
  const [digiZoom, setDigiZoom] = useState(1);
  const [weather, setWeather] = useState<Weather>("clear");
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [targetId, setTargetId] = useState<ThermalTargetId>("deer");
  const [matrix, setMatrix] = useState<ThermalMatrix>(params.matrix);
  const [compareOn, setCompareOn] = useState(false);

  const activeTarget = useMemo(() => getThermalTarget(targetId), [targetId]);
  /** Single peer to compare with (exactly 2 windows total when set). */
  const [compareOptionId, setCompareOptionId] = useState<string>("preset:256");
  const [catalog, setCatalog] = useState<ThermalCompareOption[]>(
    compareOptionsProp || []
  );
  const [ready, setReady] = useState(false);

  const currentParams: ThermalSimParams = useMemo(
    () => ({
      ...params,
      matrix: allowMatrixPick ? matrix : params.matrix,
      label: params.label || (isRu ? "Этот прибор" : "Цей прилад"),
      focalMm: params.focalMm ?? null,
      pitchUm: params.pitchUm ?? null,
    }),
    [params, matrix, allowMatrixPick, isRu]
  );

  const compareParams = useMemo(() => {
    if (!compareOn) return null;
    return resolveCompareSelection(compareOptionId, catalog, isRu);
  }, [compareOn, compareOptionId, catalog, isRu]);

  /** Always 1 panel, or exactly 2 when compare is on. */
  const activePanels = useMemo(() => {
    const list: {
      key: PanelKey;
      params: ThermalSimParams;
      /** Full model name shown above the canvas */
      modelName: string;
      badge: string;
    }[] = [
      {
        key: "current",
        params: currentParams,
        modelName: currentParams.label,
        badge: isRu ? "Этот прибор" : "Цей прилад",
      },
    ];
    if (compareOn && compareParams) {
      list.push({
        key: "compare",
        params: compareParams,
        modelName: compareParams.label,
        badge: isRu ? "Сравнение" : "Порівняння",
      });
    }
    return list;
  }, [currentParams, compareOn, compareParams, isRu]);

  /** Passport D is usually human; scale by target critical size */
  const panelDetectionD = useCallback(
    (passportD: number) =>
      detectionRangeForTarget(passportD, activeTarget.criticalSizeM),
    [activeTarget.criticalSizeM]
  );

  const sliderMax = useMemo(() => {
    const ds = activePanels.map((p) =>
      panelDetectionD(p.params.detectionRangeM)
    );
    return Math.max(300, ...ds, panelDetectionD(currentParams.detectionRangeM));
  }, [activePanels, currentParams.detectionRangeM, panelDetectionD]);

  useEffect(() => {
    setMatrix(params.matrix);
  }, [params.matrix]);

  useEffect(() => {
    setDistance((d) => Math.min(d, sliderMax));
  }, [sliderMax]);

  useEffect(() => {
    if (compareOptionsProp?.length) {
      setCatalog(compareOptionsProp);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ locale });
    if (currentProductId) q.set("exclude", currentProductId);
    fetch(`/api/products/thermal-specs?${q}`)
      .then((r) => r.json())
      .then((data: { items?: ThermalCompareOption[] }) => {
        if (!cancelled && data.items) setCatalog(data.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [compareOptionsProp, locale, currentProductId]);

  const canvasMap = useRef<Map<PanelKey, HTMLCanvasElement>>(new Map());
  const forestImg = useRef<HTMLImageElement | null>(null);
  const subjectImg = useRef<HTMLImageElement | null>(null);
  const subjectSprite = useRef<DeerSprite | null>(null);
  const composeRef = useRef<HTMLCanvasElement | null>(null);
  const subjectLayerRef = useRef<HTMLCanvasElement | null>(null);
  const matrixRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let n = 0;
    const done = () => {
      n += 1;
      if (n >= 2 && !cancelled) {
        subjectSprite.current = subjectImg.current
          ? buildDeerSprite(subjectImg.current)
          : null;
        setReady(true);
      }
    };
    const load = (src: string, ref: { current: HTMLImageElement | null }) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = done;
      img.onerror = done;
      img.src = src;
      ref.current = img;
    };
    setReady(false);
    subjectSprite.current = null;
    load(scene.forest, forestImg);
    load(activeTarget.subjectSrc, subjectImg);
    return () => {
      cancelled = true;
    };
  }, [scene.forest, activeTarget.subjectSrc]);

  const renderPanel = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      panelParams: ThermalSimParams,
      panelSeedExtra: string
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (canvas.width !== LOGIC_W || canvas.height !== LOGIC_H) {
        canvas.width = LOGIC_W;
        canvas.height = LOGIC_H;
      }

      if (!composeRef.current) {
        composeRef.current = document.createElement("canvas");
      }
      const compose = composeRef.current;
      compose.width = LOGIC_W;
      compose.height = LOGIC_H;
      const cctx = compose.getContext("2d", { willReadFrequently: true });
      if (!cctx) return;

      // ── Layered thermal palette (BEFORE pixelation) ──
      // Forest → cold band only; deer → full hot range. One shared luma→LUT
      // would paint canopy highlights as "heat" (physically wrong).

      // ---- 1) Forest background → cold palette ----
      cctx.fillStyle = "#0a0b10";
      cctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      cctx.imageSmoothingEnabled = true;
      const forest = forestImg.current;
      if (forest && forest.complete && forest.naturalWidth > 0) {
        drawForestCover(cctx, forest, LOGIC_W, LOGIC_H);
      }
      {
        const forestData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
        applyThermalPalette(forestData.data, palette, "cold", false);
        cctx.putImageData(forestData, 0, 0);
      }

      // ---- 2) Subject layer (same ground anchor for all targets) → HOT palette ----
      const sprite = subjectSprite.current;
      let focusX = 0.5;
      let focusY = 0.75;
      // D scaled by target size (fox much closer D than deer)
      const rangeD = panelDetectionD(panelParams.detectionRangeM);
      if (sprite) {
        if (!subjectLayerRef.current) {
          subjectLayerRef.current = document.createElement("canvas");
        }
        const sub = subjectLayerRef.current;
        sub.width = LOGIC_W;
        sub.height = LOGIC_H;
        const sctx = sub.getContext("2d", { willReadFrequently: true });
        if (sctx) {
          sctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
          const sink = Math.max(1, Math.round(LOGIC_H * 0.005));
          // Size: FOV optics × visual height / distance (fog must not move/resize)
          const hFrac = opticsTargetHeightFrac(
            activeTarget.visualHeightM,
            distance,
            panelParams,
            1
          );
          const rect = deerScreenRect(
            distance,
            LOGIC_W,
            LOGIC_H,
            sprite.aspect,
            DIST_MIN_M,
            sink,
            hFrac
          );
          // Alpha from range only — never from fog (fog = noise/contrast only)
          const trans = atmosphericTransmission(distance, rangeD, false);
          focusX = rect.cx / LOGIC_W;
          focusY = rect.cy / LOGIC_H;

          drawGroundContact(
            cctx,
            rect.cx,
            rect.feetY,
            rect.w,
            Math.max(0.35, trans)
          );

          sctx.globalAlpha = 0.45 + 0.55 * trans;
          sctx.imageSmoothingEnabled = rect.h > 8;
          sctx.drawImage(
            sprite.canvas,
            sprite.cx,
            sprite.cy,
            sprite.cw,
            sprite.ch,
            rect.x,
            rect.y,
            Math.max(1, rect.w),
            Math.max(1, rect.h)
          );
          sctx.globalAlpha = 1;

          const subData = sctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
          applyThermalPalette(subData.data, palette, "hot", true);
          sctx.putImageData(subData, 0, 0);

          cctx.drawImage(sub, 0, 0);
        }
      }

      // ---- 4) Unified NETD noise (does not re-run full LUT) ----
      const seed = hashSeed(
        scene.id,
        activeTarget.id,
        panelParams.matrix,
        panelParams.netdMk,
        distance,
        weather,
        palette,
        panelSeedExtra,
        "v12-multi-target"
      );
      const rand = mulberry32(seed);
      const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
      const d = imageData.data;
      const fog = weather === "fog";
      const noiseAmp = netdNoiseAmp(
        panelParams.netdMk,
        fog,
        distance,
        rangeD
      );
      const contrast = netdContrast(panelParams.netdMk, fog);
      // Mild contrast + noise only — palette already baked per layer
      const fogLift = fog ? 8 : 0;

      for (let i = 0; i < d.length; i += 4) {
        let y = lumaOf(d[i], d[i + 1], d[i + 2]);
        // Soft NETD grain around existing tone (keep hue for iron)
        const n = (rand() - 0.5) * noiseAmp * 0.85;
        if (palette === "whitehot") {
          y = (y - 128) * (0.92 + 0.08 * contrast) + 128 + fogLift + n;
          y = Math.max(0, Math.min(255, y));
          d[i] = d[i + 1] = d[i + 2] = y;
        } else {
          // Perturb luminance slightly then re-apply local iron from NEW luma
          // but clamp: if pixel was cold (low R+G, high-ish B or dark), stay cold
          const wasCold =
            d[i] + d[i + 1] < 120 && d[i + 2] <= 160 && y < 100;
          y = y + n + fogLift * 0.5;
          y = Math.max(0, Math.min(255, y));
          if (wasCold) {
            // Keep forest in cold iron tones only
            const Lcold = Math.min(FOREST_LUMA_MAX, (y / 255) * 0.9);
            const [rr, gg, bb] = ironLut(Lcold);
            d[i] = rr;
            d[i + 1] = gg;
            d[i + 2] = bb;
          } else {
            // Subject: small noise around existing RGB
            d[i] = Math.max(0, Math.min(255, d[i] + n * 0.6));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.5));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.4));
          }
        }
        d[i + 3] = 255;
      }
      cctx.putImageData(imageData, 0, 0);

      const pixW = matrixPixelWidth(panelParams.matrix);
      const pixH = Math.round(pixW * (LOGIC_H / LOGIC_W)); // 4:3
      if (!matrixRef.current) {
        matrixRef.current = document.createElement("canvas");
      }
      const mCan = matrixRef.current;
      mCan.width = pixW;
      mCan.height = pixH;
      const mctx = mCan.getContext("2d");
      if (!mctx) return;
      mctx.imageSmoothingEnabled = true;
      mctx.drawImage(compose, 0, 0, pixW, pixH);

      const { sx, sy, sw, sh } = digitalZoomCrop(
        pixW,
        pixH,
        digiZoom,
        focusX,
        focusY
      );
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.drawImage(mCan, sx, sy, sw, sh, 0, 0, LOGIC_W, LOGIC_H);

      // Device frame: ocular circle (+ reticle) or screen rect 4:3
      applyDeviceFrame(ctx, LOGIC_W, LOGIC_H, viewForm, withScopeReticle);

      const hudLines: { text: string; color: string }[] = [
        {
          text: `${panelParams.matrix}×${Math.round(panelParams.matrix * 0.75)}`,
          color: "rgba(225,29,42,0.95)",
        },
        {
          text: `${distance} m`,
          color: "rgba(245,246,247,0.88)",
        },
        {
          text: `D ${panelParams.detectionRangeM} · NETD ${panelParams.netdMk}`,
          color: "rgba(245,246,247,0.75)",
        },
      ];
      if (panelParams.refreshRateHz) {
        hudLines.push({
          text: `${panelParams.refreshRateHz} Hz`,
          color: "rgba(245,246,247,0.7)",
        });
      }
      if (digiZoom > 1) {
        hudLines.push({
          text: `DIGI ×${digiZoom}`,
          color: "rgba(225,29,42,0.95)",
        });
      }
      drawDeviceHud(ctx, LOGIC_W, LOGIC_H, viewForm, hudLines);

      // Digi-zoom inspect: small cross (only if not full scope reticle already)
      if (digiZoom > 1 && !withScopeReticle) {
        const cx = LOGIC_W / 2;
        const cy = LOGIC_H / 2;
        ctx.strokeStyle = "rgba(225,29,42,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy);
        ctx.lineTo(cx - 3, cy);
        ctx.moveTo(cx + 3, cy);
        ctx.lineTo(cx + 12, cy);
        ctx.moveTo(cx, cy - 12);
        ctx.lineTo(cx, cy - 3);
        ctx.moveTo(cx, cy + 3);
        ctx.lineTo(cx, cy + 12);
        ctx.stroke();
      }
    },
    [
      scene,
      distance,
      digiZoom,
      weather,
      palette,
      viewForm,
      withScopeReticle,
      activeTarget.id,
      activeTarget.visualHeightM,
      panelDetectionD,
    ]
  );

  useEffect(() => {
    if (!ready) return;
    for (const panel of activePanels) {
      renderPanel(
        canvasMap.current.get(panel.key) || null,
        panel.params,
        panel.key
      );
    }
  }, [
    ready,
    activePanels,
    renderPanel,
    distance,
    digiZoom,
    weather,
    palette,
    targetId,
  ]);

  const panelStatus = (p: ThermalSimParams) => {
    const fog = weather === "fog";
    const rangeD = panelDetectionD(p.detectionRangeM);
    const status = computeDetectStatus({
      distanceM: distance,
      maxRangeM: rangeD,
      fog,
    });
    const px = effectivePixelsOnTarget(distance, rangeD, fog);
    const bands = johnsonBandDistancesM(rangeD);
    const pixH = matrixPixelHeight(p.matrix);
    // Visual size: FOV × body height (stable under fog)
    const visualSensorPx =
      opticsTargetHeightFrac(activeTarget.visualHeightM, distance, p, 1) * pixH;
    const fovVertDeg =
      (resolveFovVerticalRad({
        matrix: p.matrix,
        focalMm: p.focalMm,
        pitchUm: p.pitchUm,
      }) *
        180) /
      Math.PI;
    return { status, px, bands, visualSensorPx, pixH, rangeD, fovVertDeg };
  };

  const setCanvasRef = (key: PanelKey) => (el: HTMLCanvasElement | null) => {
    if (el) canvasMap.current.set(key, el);
    else canvasMap.current.delete(key);
  };

  const catalogFiltered = catalog.filter((c) => c.id !== currentProductId);

  return (
    <section
      className={cn(
        "thermal-sim rounded-[var(--radius-card)] border border-white/[0.1] p-5 sm:p-6",
        className
      )}
      style={{ background: "var(--surface)" }}
      aria-label={isRu ? "Симулятор тепловизора" : "Симулятор тепловізора"}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-primary sm:text-xl">
            {isRu
              ? "Как этот прибор видит в темноте"
              : "Як цей прилад бачить у темряві"}
          </h2>
          <p className="mt-1 text-sm text-secondary">
            {isRu
              ? `Матрица ${currentParams.matrix}, NETD ≤${currentParams.netdMk} mK, D=${currentParams.detectionRangeM} м · ${scene.labelRu}`
              : `Матриця ${currentParams.matrix}, NETD ≤${currentParams.netdMk} mK, D=${currentParams.detectionRangeM} м · ${scene.labelUk}`}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">
            {isRu
              ? viewForm === "ocular"
                ? "Кадр 4:3 · круглое поле (окуляр)" +
                  (withScopeReticle ? " · прицельная сетка" : "")
                : "Кадр 4:3 · прямоугольный экран монокуляра"
              : viewForm === "ocular"
                ? "Кадр 4:3 · кругле поле (окуляр)" +
                  (withScopeReticle ? " · прицільна сітка" : "")
                : "Кадр 4:3 · прямокутний екран монокуляра"}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          activePanels.length === 1 && "grid-cols-1",
          activePanels.length === 2 && "grid-cols-1 md:grid-cols-2"
        )}
      >
        {activePanels.map((panel) => {
          const { status, px, bands, visualSensorPx, fovVertDeg } = panelStatus(
            panel.params
          );
          const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
          const statusHint = isRu
            ? STATUS_HINT_RU[status]
            : STATUS_HINT_UK[status];
          return (
            <div key={panel.key}>
              {/* Model name always above the thermal window */}
              <div className="mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-ui">
                  {panel.badge}
                </p>
                <h3 className="mt-0.5 text-sm font-bold leading-snug text-primary sm:text-base">
                  {panel.modelName}
                </h3>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[11px] tabular-nums text-faint">
                    {panel.params.matrix}×
                    {Math.round(panel.params.matrix * 0.75)} · D=
                    {panel.params.detectionRangeM} м · NETD{" "}
                    {panel.params.netdMk} mK
                    {panel.params.focalMm
                      ? ` · f=${panel.params.focalMm} мм`
                      : ""}
                    {" · "}FOV↓ {fovVertDeg.toFixed(1)}°
                  </p>
                  <div className="max-w-[14rem] text-right">
                    <span
                      className={cn(
                        "inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        STATUS_COLOR[status]
                      )}
                    >
                      {statusLabel}
                    </span>
                    <p className="mt-0.5 text-[10px] leading-snug text-faint">
                      {statusHint}
                    </p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-faint">
                      Johnson{" "}
                      <strong className="text-secondary">{px.toFixed(1)} px</strong>
                      {" · "}
                      {isRu ? "высота на матрице" : "висота на матриці"} ≈{" "}
                      {visualSensorPx.toFixed(1)} px
                    </p>
                  </div>
                </div>
                {/* Distance bands for this device D */}
                <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
                  {isRu ? (
                    <>
                      Пороги при D={panel.params.detectionRangeM} м:{" "}
                      <span className="text-emerald-400/90">
                        идентиф. ≤{bands.identifyMaxM} м
                      </span>
                      {" · "}
                      <span className="text-sky-300/90">
                        распозн. ≤{bands.recognizeMaxM} м
                      </span>
                      {" · "}
                      <span className="text-amber-300/90">
                        обнаруж. ≤{bands.detectMaxM} м
                      </span>
                      {" · "}
                      <span className="text-zinc-400">
                        дальше — не видно (&lt;{JOHNSON_PX.detect} px)
                      </span>
                    </>
                  ) : (
                    <>
                      Пороги при D={panel.params.detectionRangeM} м:{" "}
                      <span className="text-emerald-400/90">
                        ідентиф. ≤{bands.identifyMaxM} м
                      </span>
                      {" · "}
                      <span className="text-sky-300/90">
                        розпізн. ≤{bands.recognizeMaxM} м
                      </span>
                      {" · "}
                      <span className="text-amber-300/90">
                        виявл. ≤{bands.detectMaxM} м
                      </span>
                      {" · "}
                      <span className="text-zinc-400">
                        далі — не видно (&lt;{JOHNSON_PX.detect} px)
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div
                className="relative overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black"
                style={{
                  boxShadow:
                    panel.key === "current"
                      ? "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.5)"
                      : "0 0 0 3px #12141a",
                }}
              >
                <canvas
                  ref={setCanvasRef(panel.key)}
                  width={LOGIC_W}
                  height={LOGIC_H}
                  className="block h-auto w-full"
                  style={{ aspectRatio: "4 / 3" }}
                  role="img"
                  aria-label={`${panel.modelName}: ${statusLabel}, ${distance} m`}
                />

                {/* On-screen digi-zoom: inspect far detection hot-mark */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
                  <div className="pointer-events-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDigiZoom(nextDigiZoom(digiZoom, -1))}
                      disabled={digiZoom <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                      aria-label="−"
                    >
                      −
                    </button>
                    <span className="min-w-[2.5rem] text-center text-[11px] font-semibold tabular-nums text-white">
                      ×{digiZoom}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDigiZoom(nextDigiZoom(digiZoom, 1))}
                      disabled={digiZoom >= 16}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const z = inspectDigiZoom(distance);
                      setDigiZoom(digiZoom >= z && digiZoom > 1 ? 1 : z);
                    }}
                    className="pointer-events-auto rounded-md border border-[var(--accent)]/80 bg-[rgba(225,29,42,0.85)] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg"
                  >
                    {digiZoom > 1
                      ? isRu
                        ? "Сброс ×1"
                        : "Скинути ×1"
                      : isRu
                        ? "Увеличить цель"
                        : "Збільшити ціль"}
                  </button>
                </div>
              </div>
              {distance >= 600 && digiZoom === 1 && (
                <p className="mt-1.5 text-[10px] leading-snug text-amber-200/80">
                  {isRu
                    ? "На большой дистанции цель — крошечная тёплая точка. Нажмите «Увеличить цель» (цифровой зум), чтобы увидеть, что выявление реально работает."
                    : "На великій дистанції ціль — крихітна тепла точка. Натисніть «Збільшити ціль» (цифровий зум), щоб побачити, що виявлення реально працює."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <fieldset className="sm:col-span-2 lg:col-span-3">
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Цель" : "Ціль"}{" "}
            <span className="font-normal text-faint">
              (
              {isRu
                ? `высота ${activeTarget.visualHeightM} м · крит. ${activeTarget.criticalSizeM} м · D ≈ ${panelDetectionD(currentParams.detectionRangeM)} м`
                : `висота ${activeTarget.visualHeightM} м · крит. ${activeTarget.criticalSizeM} м · D ≈ ${panelDetectionD(currentParams.detectionRangeM)} м`}
              )
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {THERMAL_TARGETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTargetId(t.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition",
                  targetId === t.id
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary hover:border-white/20"
                )}
              >
                {isRu ? t.labelRu : t.labelUk}
                <span className="ml-1.5 text-[10px] text-faint">
                  {t.criticalSizeM} м
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-faint">
            {isRu
              ? "Лиса (0.3 м) «съедается» дальностью первой — наглядно, зачем нужна лучшая матрица. Туман/палитра не двигают цель."
              : "Лисиця (0.3 м) «з'їдається» дальністю першою — наочно, навіщо краща матриця. Туман/палітра не рухають ціль."}
          </p>
        </fieldset>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium text-muted-ui">
              <span>
                {isRu ? "Дистанция до цели (общая)" : "Дистанція до цілі (спільна)"}
              </span>
              <span className="tabular-nums text-primary">{distance} м</span>
            </span>
            <input
              type="range"
              min={DIST_MIN_M}
              max={sliderMax}
              step={10}
              value={Math.min(distance, sliderMax)}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="thermal-range w-full"
              aria-valuemin={DIST_MIN_M}
              aria-valuemax={sliderMax}
              aria-valuenow={distance}
            />
            <span className="mt-1 block text-[11px] text-faint">
              {isRu
                ? `Размер на экране = (высота/дистанция)/FOV_верт (оптика). Статус Johnson: px=2×(D/d). Туман — только шум/статус, не размер.`
                : `Розмір на екрані = (висота/дистанція)/FOV_верт (оптика). Статус Johnson: px=2×(D/d). Туман — лише шум/статус, не розмір.`}
            </span>
          </label>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu
              ? "Цифровой зум (на экране прибора)"
              : "Цифровий зум (на екрані приладу)"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {DIGI_ZOOM_STEPS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setDigiZoom(z)}
                className={cn(
                  "min-w-[3rem] flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition",
                  digiZoom === z
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary hover:border-white/20"
                )}
              >
                ×{z}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-faint">
            {isRu
              ? `Цифровой зум только увеличивает блоки матрицы. «Увеличить цель» → ×${inspectDigiZoom(distance)} — чтобы на большой дистанции увидеть hot-mark (статус «Обнаружение»).`
              : `Цифровий зум лише збільшує блоки матриці. «Збільшити ціль» → ×${inspectDigiZoom(distance)} — щоб на великій дистанції побачити hot-mark (статус «Виявлення»).`}
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Погода" : "Погода"}
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["clear", isRu ? "Ясно" : "Ясно"],
                ["fog", isRu ? "Туман" : "Туман"],
              ] as const
            ).map(([v, lab]) => (
              <button
                key={v}
                type="button"
                onClick={() => setWeather(v)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  weather === v
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary hover:border-white/20"
                )}
              >
                {lab}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Палитра" : "Палітра"}
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["whitehot", "White-hot"],
                ["ironhot", "Red-hot"],
              ] as const
            ).map(([v, lab]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPalette(v)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  palette === v
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary hover:border-white/20"
                )}
              >
                {lab}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCompareOn((v) => {
                  const next = !v;
                  if (next && !compareOptionId) {
                    setCompareOptionId("preset:256");
                  }
                  return next;
                });
              }}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                compareOn
                  ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                  : "border-white/15 text-secondary hover:border-white/30"
              )}
            >
              {compareOn
                ? isRu
                  ? "Закрыть сравнение"
                  : "Закрити порівняння"
                : isRu
                  ? "Сравнить с другим прибором"
                  : "Порівняти з іншим приладом"}
            </button>
            {allowMatrixPick && (
              <label className="text-xs text-muted-ui">
                {isRu ? "Матрица" : "Матриця"}
                <select
                  className="ml-2 rounded-lg border border-white/15 bg-[#12141a] px-2 py-1.5 text-sm text-primary"
                  value={matrix}
                  onChange={(e) =>
                    setMatrix(Number(e.target.value) as ThermalMatrix)
                  }
                >
                  <option value={256}>256×192</option>
                  <option value={384}>384×288</option>
                  <option value={640}>640×512</option>
                </select>
              </label>
            )}
          </div>

          {compareOn && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
              <label className="block text-xs font-medium text-muted-ui">
                {isRu
                  ? "С чем сравниваем (одно окно рядом)"
                  : "З чим порівнюємо (одне вікно поруч)"}
                <select
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#12141a] px-3 py-2.5 text-sm text-primary"
                  value={compareOptionId}
                  onChange={(e) => setCompareOptionId(e.target.value)}
                >
                  <optgroup
                    label={isRu ? "Быстрые классы матриц" : "Швидкі класи матриць"}
                  >
                    <option value="preset:256">
                      Клас 256×192 · D={defaultDetectionRangeM(256)} · NETD 40
                    </option>
                    <option value="preset:384">
                      Клас 384×288 · D={defaultDetectionRangeM(384)} · NETD 35
                    </option>
                    <option value="preset:640">
                      Клас 640×512 · D={defaultDetectionRangeM(640)} · NETD 25
                    </option>
                  </optgroup>
                  {catalogFiltered.length > 0 && (
                    <optgroup
                      label={
                        isRu ? "Модели из каталога" : "Моделі з каталогу"
                      }
                    >
                      {catalogFiltered.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} · {o.matrix} · D={o.detectionRangeM} · NETD{" "}
                          {o.netdMk}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <p className="mt-2 text-[11px] text-faint">
                {isRu
                  ? "Всегда 2 окна: ваш прибор (слева) и выбранный для сравнения (справа)."
                  : "Завжди 2 вікна: ваш прилад (зліва) і обраний для порівняння (справа)."}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        {isRu
          ? `Размер цели: (высота_м/дистанция)/FOV_верт из объектива+pitch+матрицы (типовой FOV~11° если линза неизвестна). Джонсон-статус: ≥${JOHNSON_PX.identify}/${JOHNSON_PX.recognize}/${JOHNSON_PX.detect} px, px=2×(D/dist). На D — тепловая точка. Шум←NETD; зерно←матрица. Лес холодный, цель горячая.`
          : `Розмір цілі: (висота_м/дистанція)/FOV_верт з об'єктива+pitch+матриці (типовий FOV~11° якщо лінза невідома). Johnson-статус: ≥${JOHNSON_PX.identify}/${JOHNSON_PX.recognize}/${JOHNSON_PX.detect} px, px=2×(D/dist). На D — теплова пляма. Шум←NETD; зерно←матриця. Ліс холодний, ціль гаряча.`}
      </p>
      <p className="mt-2 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-faint/90">
        {isRu
          ? "D — паспортная дальность выявления (часто для человека); сцена — олень. Симуляция приблизительная."
          : "D — паспортна дальність виявлення (часто для людини); сцена — олень. Симуляція приблизна."}
      </p>

      <style jsx>{`
        .thermal-range {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          outline: none;
        }
        .thermal-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #e11d2a;
          cursor: pointer;
          border: 2px solid #f5f6f7;
        }
      `}</style>
    </section>
  );
}

export { SCENES };
