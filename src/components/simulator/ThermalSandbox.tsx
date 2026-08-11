"use client";

/**
 * Thermal sandbox — deer-only, simple UI.
 * Scene: fixed-FOV forest + hot deer on ground plane (sales-readable size).
 * DRI numbers still come from Johnson optics (matrix / pitch / focal / NETD).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThermalCompareOption } from "@/lib/thermal/parse-product-thermal";
import { netdContrast, netdNoiseAmp } from "@/lib/thermal/parse-product-thermal";
import {
  DIGI_ZOOM_STEPS,
  digitalZoomCrop,
  DIST_MIN_M,
  deerScreenRect,
  inspectDigiZoom,
  nextDigiZoom,
  subjectHeightFrac,
  atmosphericTransmission,
} from "@/lib/thermal/zoom";
import {
  INPUT_LIMITS,
  MATRIX_PRESETS,
  PITCH_OPTIONS,
  TARGET_SIZE_M,
  clampSandboxInputs,
  computeSandbox,
  sandboxMatrixPixelWidth,
  statusFromPixels,
  type PixelPitchUm,
  type SandboxInputs,
  type SandboxMatrix,
} from "@/lib/thermal/sandbox-physics";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";

const LOGIC_W = 480;
const LOGIC_H = 360; // 4:3
const SPRITE_S = 512;
const FOREST_SRC = "/thermal/forest_whitehot.jpg";
const DEER_SRC = "/thermal/deer_subject_whitehot.jpg";

/** Deer only — locked target for this sandbox. */
const TARGET: SandboxInputs["target"] = "deer";
const DEER_VISUAL_H_M = 1.3;

const STATUS_UK = {
  identify: "Ідентифікація",
  recognize: "Розпізнавання",
  detect: "Виявлення",
  none: "Не видно",
} as const;
const STATUS_RU = {
  identify: "Идентификация",
  recognize: "Распознавание",
  detect: "Обнаружение",
  none: "Не видно",
} as const;

const STATUS_COLOR = {
  identify: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  recognize: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  detect: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  none: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
} as const;

type Props = {
  locale?: string;
  catalogPresets?: ThermalCompareOption[];
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

function lumaOf(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Cover forest, bias crop slightly toward ground litter. */
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
  const sy = Math.min(syMax, syMax * 0.72);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

type DeerSprite = {
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  aspect: number;
};

/**
 * Luma-key deer on black → solid RGBA sprite.
 * Body alpha is pushed high so the animal reads as a clear hot mark.
 */
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
  const lo = 16;
  const hi = 58;
  let minX = SPRITE_S;
  let maxX = 0;
  let minY = SPRITE_S;
  let maxY = 0;
  for (let y = 0; y < SPRITE_S; y++) {
    for (let x = 0; x < SPRITE_S; x++) {
      const i = (y * SPRITE_S + x) * 4;
      const l = lumaOf(d[i], d[i + 1], d[i + 2]);
      let t = (l - lo) / (hi - lo);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      // smoothstep, then body boost so mid-tones stay opaque
      let a = t * t * (3 - 2 * t);
      if (a > 0.12) a = Math.min(1, 0.22 + a * 0.95);
      // mild heat stretch — keep hot spots hot
      const L = Math.min(255, l * 1.08 + (a > 0.5 ? 8 : 0));
      d[i] = d[i + 1] = d[i + 2] = L;
      d[i + 3] = Math.round(a * 255);
      if (a > 0.4) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(id, 0, 0);
  if (maxX <= minX || maxY <= minY) return null;

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

function presetFromCatalog(o: ThermalCompareOption): Partial<SandboxInputs> {
  const w = (o.matrix >= 640 ? 640 : o.matrix >= 384 ? 384 : 256) as SandboxMatrix;
  const pitch = 12;
  const k = INPUT_LIMITS.kDefault;
  const target = TARGET_SIZE_M.deer;
  const fEst =
    (o.detectionRangeM * 2 * (pitch / 1000)) / (k * target);
  return {
    matrixW: w,
    pitchUm: 12,
    netdMk: o.netdMk,
    focalMm: Math.max(13, Math.min(100, Math.round(fEst))),
    target: TARGET,
    distanceM: Math.min(250, Math.max(80, Math.round(o.detectionRangeM * 0.12))),
    fog: false,
    kCalib: INPUT_LIMITS.kDefault,
  };
}

export function ThermalSandbox({ locale = "uk", catalogPresets = [] }: Props) {
  const isRu = locale === "ru";
  const [inputs, setInputs] = useState<SandboxInputs>(() =>
    clampSandboxInputs({
      matrixW: 640,
      pitchUm: 12,
      netdMk: 25,
      focalMm: 35,
      target: TARGET,
      distanceM: 150,
      fog: false,
      kCalib: INPUT_LIMITS.kDefault,
    })
  );
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [digiZoom, setDigiZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [presetId, setPresetId] = useState("");

  const computed = useMemo(() => computeSandbox(inputs), [inputs]);
  const distMax = Math.max(
    DIST_MIN_M + 50,
    Math.round(computed.dri.detectM)
  );

  useEffect(() => {
    setInputs((prev) => {
      const next = clampSandboxInputs({
        ...prev,
        target: TARGET,
        distanceM: prev.distanceM,
      });
      if (
        next.distanceM !== prev.distanceM ||
        next.target !== prev.target
      ) {
        return next;
      }
      return prev;
    });
  }, [inputs.focalMm, inputs.pitchUm, inputs.matrixW, inputs.kCalib]);

  const patch = useCallback((p: Partial<SandboxInputs>) => {
    setInputs((prev) =>
      clampSandboxInputs({ ...prev, ...p, target: TARGET })
    );
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const forestImg = useRef<HTMLImageElement | null>(null);
  const deerImg = useRef<HTMLImageElement | null>(null);
  const deerSprite = useRef<DeerSprite | null>(null);
  const composeRef = useRef<HTMLCanvasElement | null>(null);
  const matrixRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let n = 0;
    let cancelled = false;
    const done = () => {
      n += 1;
      if (n >= 2 && !cancelled) {
        deerSprite.current = deerImg.current
          ? buildDeerSprite(deerImg.current)
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
    deerSprite.current = null;
    load(FOREST_SRC, forestImg);
    load(DEER_SRC, deerImg);
    return () => {
      cancelled = true;
    };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = LOGIC_W;
    canvas.height = LOGIC_H;

    if (!composeRef.current) composeRef.current = document.createElement("canvas");
    const compose = composeRef.current;
    compose.width = LOGIC_W;
    compose.height = LOGIC_H;
    const cctx = compose.getContext("2d", { willReadFrequently: true });
    if (!cctx) return;

    const fog = inputs.fog;
    const detM = Math.max(200, computed.dri.detectM);
    const dist = inputs.distanceM;

    // ── Layer 1: forest (fixed FOV plate) ──────────────────────────
    cctx.fillStyle = "#0a0b10";
    cctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    cctx.imageSmoothingEnabled = true;
    if (forestImg.current?.complete && forestImg.current.naturalWidth > 0) {
      drawForestCover(cctx, forestImg.current, LOGIC_W, LOGIC_H);
    }

    // ── Layer 2: deer on ground plane (readable sales size) ────────
    const sprite = deerSprite.current;
    let focusX = 0.5;
    let focusY = 0.72;
    if (sprite) {
      // Past D_detect → no hot mark (honest “не видно”)
      const pastDetect = dist > detM * (fog ? 0.6 : 1) * 1.08;
      if (!pastDetect) {
        const hFrac = subjectHeightFrac(DEER_VISUAL_H_M, dist);
        const rect = deerScreenRect(
          dist,
          LOGIC_W,
          LOGIC_H,
          sprite.aspect,
          DIST_MIN_M,
          0,
          hFrac
        );
        const trans = atmosphericTransmission(dist, detM, fog);
        focusX = rect.cx / LOGIC_W;
        focusY = rect.cy / LOGIC_H;

        // Warm ground contact (planted, not pasted)
        const feetY = rect.feetY ?? rect.y + rect.h;
        const bloomR = Math.max(6, rect.w * 0.65);
        cctx.save();
        cctx.translate(rect.cx, feetY);
        cctx.scale(1, 0.26);
        const bloom = cctx.createRadialGradient(0, 0, 0, 0, 0, bloomR);
        bloom.addColorStop(0, `rgba(255, 236, 190, ${0.42 * trans})`);
        bloom.addColorStop(0.55, `rgba(255, 210, 140, ${0.16 * trans})`);
        bloom.addColorStop(1, "rgba(255,220,160,0)");
        cctx.fillStyle = bloom;
        cctx.beginPath();
        cctx.arc(0, 0, bloomR, 0, Math.PI * 2);
        cctx.fill();
        cctx.restore();

        // Strong opacity — distant targets only wash slightly
        cctx.globalAlpha = Math.max(0.55, 0.62 + 0.38 * trans);
        cctx.imageSmoothingEnabled = rect.h > 6;
        cctx.drawImage(
          sprite.canvas,
          sprite.cx,
          sprite.cy,
          sprite.cw,
          sprite.ch,
          rect.x,
          rect.y,
          rect.w,
          rect.h
        );
        cctx.globalAlpha = 1;
      }
    }

    // ── Unified sensor FX: contrast + NETD noise + palette ─────────
    const seed = hashSeed(
      inputs.matrixW,
      inputs.pitchUm,
      inputs.focalMm,
      inputs.netdMk,
      dist,
      fog,
      palette,
      "sandbox-deer-v2"
    );
    const rand = mulberry32(seed);
    const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
    const d = imageData.data;
    const noiseAmp = netdNoiseAmp(inputs.netdMk, fog, dist, detM);
    const contrast = netdContrast(inputs.netdMk, fog);
    const fogLift = fog ? 18 : 0;

    for (let i = 0; i < d.length; i += 4) {
      let y = lumaOf(d[i], d[i + 1], d[i + 2]);
      // Lift very bright (deer) a touch so heat pops against forest
      if (y > 140) y = Math.min(255, y * 1.06 + 6);
      y = (y - 128) * (0.88 + 0.12 * contrast) + 128 + fogLift;
      y += (rand() - 0.5) * noiseAmp * 0.9;
      y = Math.max(0, Math.min(255, y));

      if (palette === "whitehot") {
        d[i] = d[i + 1] = d[i + 2] = y;
      } else {
        const [rr, gg, bb] = ironLut(y / 255);
        d[i] = rr;
        d[i + 1] = gg;
        d[i + 2] = bb;
      }
      d[i + 3] = 255;
    }
    cctx.putImageData(imageData, 0, 0);

    // ── Matrix pixelation ──────────────────────────────────────────
    const pixW = sandboxMatrixPixelWidth(inputs.matrixW);
    const pixH = Math.round(pixW * (LOGIC_H / LOGIC_W));
    if (!matrixRef.current) matrixRef.current = document.createElement("canvas");
    const mCan = matrixRef.current;
    mCan.width = pixW;
    mCan.height = pixH;
    const mctx = mCan.getContext("2d");
    if (!mctx) return;
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(compose, 0, 0, pixW, pixH);

    const crop = digitalZoomCrop(pixW, pixH, digiZoom, focusX, focusY);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
    ctx.drawImage(
      mCan,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      LOGIC_W,
      LOGIC_H
    );

    // Soft vignette
    const grd = ctx.createRadialGradient(
      LOGIC_W / 2,
      LOGIC_H / 2,
      LOGIC_H * 0.3,
      LOGIC_W / 2,
      LOGIC_H / 2,
      LOGIC_H * 0.78
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

    // HUD overlay
    ctx.fillStyle = "rgba(225,29,42,0.95)";
    ctx.font = "600 11px Manrope, system-ui, sans-serif";
    ctx.fillText(`${inputs.matrixW}×${inputs.matrixH}`, 12, 20);
    ctx.fillStyle = "rgba(245,246,247,0.9)";
    ctx.fillText(`${Math.round(dist)} m`, 12, 36);
    ctx.fillText(
      `${inputs.focalMm} mm · ${inputs.pitchUm} µm · NETD ${inputs.netdMk}`,
      12,
      52
    );
    if (digiZoom > 1) {
      ctx.fillStyle = "rgba(225,29,42,0.95)";
      ctx.textAlign = "right";
      ctx.fillText(`DIGI ×${digiZoom}`, LOGIC_W - 12, 20);
      ctx.textAlign = "left";
    }
  }, [ready, inputs, palette, digiZoom, computed]);

  useEffect(() => {
    render();
  }, [render]);

  // Status from Johnson pixels (optics), not the boosted on-screen size
  const visualStatus = useMemo(() => {
    const detM = Math.max(200, computed.dri.detectM);
    const deff = inputs.fog ? detM * 0.6 : detM;
    if (inputs.distanceM > deff * 1.08) return "none" as const;
    return statusFromPixels(computed.pixelsOnTargetClear, inputs.fog);
  }, [inputs, computed.pixelsOnTargetClear, computed.dri.detectM]);

  const statusLabel = isRu
    ? STATUS_RU[visualStatus]
    : STATUS_UK[visualStatus];

  const applyPreset = (id: string) => {
    setPresetId(id);
    if (!id) return;
    if (id === "rs75") {
      patch({
        matrixW: 1280,
        pitchUm: 12,
        netdMk: 20,
        focalMm: 75,
        target: TARGET,
        kCalib: INPUT_LIMITS.kDefault,
        distanceM: 250,
      });
      return;
    }
    const o = catalogPresets.find((p) => p.id === id);
    if (o) patch(presetFromCatalog(o));
  };

  const hFracNow = subjectHeightFrac(DEER_VISUAL_H_M, inputs.distanceM);

  return (
    <div className="space-y-5">
      {/* Yellow disclaimer — approximate only */}
      <div
        role="note"
        className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 px-4 py-3.5 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
      >
        <p className="text-sm font-semibold leading-snug text-amber-200 sm:text-[15px]">
          {isRu
            ? "⚠ Симулятор — очень приблизительная оценка"
            : "⚠ Симулятор — дуже приблизна оцінка"}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-100/90 sm:text-[13px]">
          {isRu
            ? "В реальности всё работает иначе: атмосфера, ΔT цели, оптика и электроника прибора. Это наглядная модель для понимания принципов, а не полевой тест. Уточняйте у нашего специалиста."
            : "У реальності все працює інакше: атмосфера, ΔT цілі, оптика та електроніка приладу. Це наочна модель для розуміння принципів, а не польовий тест. Уточнюйте у нашого спеціаліста."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main: canvas */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                {isRu
                  ? "Симулятор тепловизора"
                  : "Симулятор тепловізора"}
              </h1>
              <p className="mt-1 text-sm text-secondary">
                {isRu
                  ? "Олень в лесу · меняйте матрицу и объектив — смотрите, как меняется картинка и дальность DRI."
                  : "Олень у лісі · змінюйте матрицю та об'єктив — дивіться, як змінюється картинка і дальність DRI."}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                STATUS_COLOR[visualStatus]
              )}
            >
              {statusLabel}
            </span>
          </div>

          <div
            className="relative overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black"
            style={{
              boxShadow:
                "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.5)",
            }}
          >
            <canvas
              ref={canvasRef}
              width={LOGIC_W}
              height={LOGIC_H}
              className="block h-auto w-full"
              style={{ aspectRatio: "4 / 3" }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
              <div className="pointer-events-auto flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                  disabled={digiZoom <= 1}
                  onClick={() => setDigiZoom(nextDigiZoom(digiZoom, -1))}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-[11px] font-semibold text-white">
                  ×{digiZoom}
                </span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                  disabled={digiZoom >= 32}
                  onClick={() => setDigiZoom(nextDigiZoom(digiZoom, 1))}
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="pointer-events-auto rounded-md border border-[var(--accent)]/80 bg-[rgba(225,29,42,0.85)] px-2.5 py-1.5 text-[11px] font-bold uppercase text-white"
                onClick={() => {
                  const z = inspectDigiZoom(
                    inputs.distanceM,
                    DIST_MIN_M,
                    hFracNow
                  );
                  setDigiZoom(digiZoom >= z && digiZoom > 1 ? 1 : z);
                }}
              >
                {digiZoom > 1
                  ? isRu
                    ? "Сброс ×1"
                    : "Скинути ×1"
                  : isRu
                    ? "Увеличить оленя"
                    : "Збільшити оленя"}
              </button>
            </div>
          </div>

          {/* Compact DRI readout */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CalcItem
              label={isRu ? "D выявл." : "D виявл."}
              value={`${Math.round(computed.dri.detectM)} м`}
              accent="amber"
            />
            <CalcItem
              label={isRu ? "D распозн." : "D розпізн."}
              value={`${Math.round(computed.dri.recognizeM)} м`}
              accent="sky"
            />
            <CalcItem
              label={isRu ? "D идент." : "D ідент."}
              value={`${Math.round(computed.dri.identifyM)} м`}
              accent="emerald"
            />
            <CalcItem
              label="FOV"
              value={`${computed.fovDeg.toFixed(1)}°`}
            />
          </div>
        </div>

        {/* Controls — simple */}
        <aside className="space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-ui">
            {isRu ? "Параметры" : "Параметри"}
          </h2>

          {catalogPresets.length > 0 && (
            <label className="block text-xs text-muted-ui">
              {isRu ? "Пресет из каталога" : "Пресет з каталогу"}
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
                value={presetId}
                onChange={(e) => applyPreset(e.target.value)}
              >
                <option value="">
                  {isRu ? "— вручную —" : "— вручну —"}
                </option>
                <option value="rs75">
                  RS75-class · 1280 · 75mm
                </option>
                {catalogPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.matrix}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-xs text-muted-ui">
            {isRu ? "Матрица" : "Матриця"}
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
              value={inputs.matrixW}
              onChange={(e) =>
                patch({ matrixW: Number(e.target.value) as SandboxMatrix })
              }
            >
              {MATRIX_PRESETS.map((m) => (
                <option key={m.w} value={m.w}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted-ui">
            Pixel pitch
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
              value={inputs.pitchUm}
              onChange={(e) =>
                patch({ pitchUm: Number(e.target.value) as PixelPitchUm })
              }
            >
              {PITCH_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p} µm
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted-ui">
            {isRu ? "Объектив" : "Об'єктив"}:{" "}
            <strong className="text-primary">{inputs.focalMm} мм</strong>
            <input
              type="range"
              min={INPUT_LIMITS.focalMin}
              max={INPUT_LIMITS.focalMax}
              step={1}
              value={inputs.focalMm}
              onChange={(e) => patch({ focalMm: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--accent)]"
            />
          </label>

          <label className="block text-xs text-muted-ui">
            NETD:{" "}
            <strong className="text-primary">{inputs.netdMk} mK</strong>
            <input
              type="range"
              min={INPUT_LIMITS.netdMin}
              max={INPUT_LIMITS.netdMax}
              step={1}
              value={inputs.netdMk}
              onChange={(e) => patch({ netdMk: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--accent)]"
            />
          </label>

          <label className="block text-xs text-muted-ui">
            {isRu ? "Дистанция" : "Дистанція"}:{" "}
            <strong className="text-primary">
              {Math.round(inputs.distanceM)} м
            </strong>
            <span className="text-faint"> / max {distMax} м</span>
            <input
              type="range"
              min={DIST_MIN_M}
              max={distMax}
              step={10}
              value={Math.min(inputs.distanceM, distMax)}
              onChange={(e) => patch({ distanceM: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--accent)]"
            />
          </label>

          <div className="flex gap-2">
            {(
              [
                ["clear", isRu ? "Ясно" : "Ясно"],
                ["fog", isRu ? "Туман" : "Туман"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => patch({ fog: k === "fog" })}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-2 text-xs font-medium",
                  (k === "fog") === inputs.fog
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary"
                )}
              >
                {lab}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {(
              [
                ["whitehot", "White-hot"],
                ["ironhot", "Red-hot"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPalette(k)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-2 text-xs font-medium",
                  palette === k
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary"
                )}
              >
                {lab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {DIGI_ZOOM_STEPS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setDigiZoom(z)}
                className={cn(
                  "rounded border px-2 py-1 text-[11px] font-semibold",
                  digiZoom === z
                    ? "border-[var(--accent)] text-primary"
                    : "border-white/10 text-faint"
                )}
              >
                ×{z}
              </button>
            ))}
          </div>

          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-faint">
            {isRu
              ? "Цель: олень (~1 м по критерию Джонсона). Цифровой зум не добавляет деталей — только увеличивает пиксели."
              : "Ціль: олень (~1 м за критерієм Джонсона). Цифровий зум не додає деталей — лише збільшує пікселі."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function CalcItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "sky" | "emerald";
}) {
  const color =
    accent === "amber"
      ? "text-amber-300"
      : accent === "sky"
        ? "text-sky-300"
        : accent === "emerald"
          ? "text-emerald-400"
          : "text-primary";
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", color)}>
        {value}
      </p>
    </div>
  );
}
