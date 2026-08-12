"use client";

/**
 * Thermal sandbox — deer-only, simple UI.
 * Scene: fixed-FOV forest + hot deer on ground plane (sales-readable size).
 * DRI numbers still come from Johnson optics (matrix / pitch / focal / NETD).
 *
 * variant "hero" — compact desktop embed (no carousel / arrows).
 * variant "full" — /simulator page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { ArrowUpRight, ScanEye } from "lucide-react";
import { netdContrast } from "@/lib/thermal/parse-product-thermal";
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
  clampSandboxInputs,
  computeSandbox,
  statusFromPixels,
  type PixelPitchUm,
  type SandboxInputs,
  type SandboxMatrix,
} from "@/lib/thermal/sandbox-physics";
import {
  noiseAmpFromSnr,
  opticalBlurSigmaPx,
  renderedRowsOnSubject,
  sensorGridForWindow,
} from "@/lib/thermal/optics-render";
import { SIM_FOV_VERT_DEG, DISPLAY_SIZE_BOOST } from "@/lib/thermal/zoom";
import { SimulatorInfoPopover } from "@/components/simulator/SimulatorInfoPopover";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";

// 4:3 backing store. Kept high so a long lens / fine pitch has somewhere to put
// its extra detail — at 360 rows the sampling grid saturated by ~35 mm and the
// objective knob stopped changing the picture.
const LOGIC_W = 960;
const LOGIC_H = 720;
/** HUD scale relative to the original 480-wide layout. */
const HUD_S = LOGIC_W / 480;
/**
 * Cap on the detector grid actually rasterised. Matched to the canvas so the
 * biggest array (1280×1024 → 1024/1.5 ≈ 683 rows) is never clipped before the
 * display itself runs out.
 */
const GRID_MAX_ROWS = LOGIC_H;
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
  /** full = /simulator page; hero = desktop homepage embed */
  variant?: "full" | "hero";
  className?: string;
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

export function ThermalSandbox({
  locale = "uk",
  variant = "full",
  className,
}: Props) {
  const isRu = locale === "ru";
  const isHero = variant === "hero";
  const [inputs, setInputs] = useState<SandboxInputs>(() =>
    clampSandboxInputs({
      matrixW: 640,
      pitchUm: 12,
      netdMk: 25,
      focalMm: 35,
      target: TARGET,
      distanceM: isHero ? 120 : 150,
      fog: false,
      kCalib: INPUT_LIMITS.kDefault,
    })
  );
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [digiZoom, setDigiZoom] = useState(1);
  const [ready, setReady] = useState(false);

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
    // Apparent thermal contrast left after the path — drives both the sprite
    // wash and, through SNR, how loud the detector noise reads.
    const trans = atmosphericTransmission(dist, detM, fog);

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

    // ── Detector sampling grid — this is what the objective changes ──
    // IFOV = pitch/f, so a longer lens or finer pitch lays MORE detector rows
    // across the same window ⇒ finer grain. Distance is absent here on purpose:
    // it shrinks the subject inside the grid instead of changing the grid.
    const grid = sensorGridForWindow({
      pitchUm: inputs.pitchUm,
      focalMm: inputs.focalMm,
      matrixH: inputs.matrixH,
      windowFovVertDeg: SIM_FOV_VERT_DEG,
      aspect: LOGIC_W / LOGIC_H,
      boost: DISPLAY_SIZE_BOOST,
      maxRows: GRID_MAX_ROWS,
    });

    if (!matrixRef.current) matrixRef.current = document.createElement("canvas");
    const gCan = matrixRef.current;
    gCan.width = grid.cols;
    gCan.height = grid.rows;
    const gctx = gCan.getContext("2d", { willReadFrequently: true });
    if (!gctx) return;

    // Optical blur (diffraction + aperture + aberration) lands BEFORE sampling,
    // in detector units — which is why an 8 µm pitch cannot simply buy detail.
    const blurPx = opticalBlurSigmaPx({ pitchUm: inputs.pitchUm });
    gctx.imageSmoothingEnabled = true;
    gctx.imageSmoothingQuality = "high";
    gctx.filter = `blur(${blurPx.toFixed(2)}px)`;
    gctx.drawImage(compose, 0, 0, grid.cols, grid.rows);
    gctx.filter = "none";

    // ── Per-DETECTOR response: contrast + NETD noise + palette ──────
    // Noise now lives on the sensor grid, so a coarse device shows coarse
    // grain — the same physical cause as its blockiness.
    const seed = hashSeed(
      inputs.matrixW,
      inputs.pitchUm,
      inputs.focalMm,
      inputs.netdMk,
      dist,
      fog,
      palette,
      "sandbox-optics-v3"
    );
    const rand = mulberry32(seed);
    const imageData = gctx.getImageData(0, 0, grid.cols, grid.rows);
    const d = imageData.data;
    const noiseAmp = noiseAmpFromSnr({
      netdMk: inputs.netdMk,
      transmission: trans,
      fog,
    });
    const contrast = netdContrast(inputs.netdMk, fog);
    const fogLift = fog ? 18 : 0;

    for (let i = 0; i < d.length; i += 4) {
      let y = lumaOf(d[i], d[i + 1], d[i + 2]);
      // Lift very bright (deer) a touch so heat pops against forest
      if (y > 140) y = Math.min(255, y * 1.06 + 6);
      y = (y - 128) * (0.88 + 0.12 * contrast) + 128 + fogLift;
      y += (rand() - 0.5) * noiseAmp;
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
    gctx.putImageData(imageData, 0, 0);

    // ── Display: crop for digital zoom, then hard-edged upscale ─────
    // Cropping magnifies the detectors already captured — no new information,
    // which is exactly why digital zoom exposes a weak lens.
    const crop = digitalZoomCrop(grid.cols, grid.rows, digiZoom, focusX, focusY);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
    ctx.drawImage(
      gCan,
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
    const px = (n: number) => n * HUD_S;
    ctx.fillStyle = "rgba(225,29,42,0.95)";
    ctx.font = `600 ${px(11)}px Manrope, system-ui, sans-serif`;
    ctx.fillText(`${inputs.matrixW}×${inputs.matrixH}`, px(12), px(20));
    ctx.fillStyle = "rgba(245,246,247,0.9)";
    ctx.fillText(`${Math.round(dist)} m`, px(12), px(36));
    ctx.fillText(
      `${inputs.focalMm} mm · ${inputs.pitchUm} µm · NETD ${inputs.netdMk}`,
      px(12),
      px(52)
    );
    // Optics readout — the sampling the picture above was actually built from.
    ctx.fillStyle = "rgba(245,246,247,0.62)";
    ctx.fillText(
      `IFOV ${grid.ifovMrad.toFixed(2)} mrad · ${grid.rows}p`,
      px(12),
      px(68)
    );
    const detailRows = renderedRowsOnSubject(
      subjectHeightFrac(DEER_VISUAL_H_M, dist),
      grid
    );
    ctx.fillText(`${detailRows.toFixed(1)} px on target`, px(12), px(84));
    // Name the actual bottleneck, so a knob that stops helping explains itself
    // instead of looking broken.
    ctx.fillStyle = "rgba(251,191,36,0.85)";
    ctx.fillText(
      grid.matrixLimited
        ? `MATRIX-LIMITED · ${inputs.matrixW}px`
        : `OPTICS-LIMITED · ${inputs.focalMm}mm/${inputs.pitchUm}µm`,
      px(12),
      px(100)
    );
    if (digiZoom > 1) {
      ctx.fillStyle = "rgba(225,29,42,0.95)";
      ctx.textAlign = "right";
      ctx.fillText(`DIGI ×${digiZoom}`, LOGIC_W - px(12), px(20));
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

  const hFracNow = subjectHeightFrac(DEER_VISUAL_H_M, inputs.distanceM);

  const canvasBlock = (
    <div
      className={cn(
        "relative overflow-hidden bg-black",
        isHero
          ? "rounded-lg border border-white/15 ring-1 ring-black/40"
          : "rounded-xl border-2 border-zinc-700/80"
      )}
      style={
        isHero
          ? {
              boxShadow:
                "inset 0 0 30px rgba(0,0,0,0.45), 0 8px 28px rgba(0,0,0,0.35)",
            }
          : {
              boxShadow:
                "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.5)",
            }
      }
    >
      <canvas
        ref={canvasRef}
        width={LOGIC_W}
        height={LOGIC_H}
        className="block h-auto w-full"
        style={{ aspectRatio: "4 / 3" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-8">
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
              ? "Увеличить"
              : "Збільшити"}
        </button>
      </div>
    </div>
  );

  /* ── Desktop hero embed: always visible, no carousel ─────────── */
  if (isHero) {
    return (
      <div
        className={cn(
          "hero-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] p-4 sm:p-5",
          className
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.15)] ring-1 ring-[var(--accent)]/35">
                <ScanEye
                  className="h-4 w-4 text-[var(--accent)]"
                  strokeWidth={2.25}
                />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-ui">
                  Live preview
                </p>
                <h2 className="truncate font-display text-lg font-bold tracking-tight text-primary">
                  {isRu ? "Симулятор тепловизора" : "Симулятор тепловізора"}
                </h2>
              </div>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
              STATUS_COLOR[visualStatus]
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div
          role="note"
          className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/[0.12] px-3 py-2"
        >
          <p className="text-[11px] leading-snug text-amber-100/95">
            {isRu
              ? "⚠ Очень приблизительная оценка. В реальности — иначе. Уточняйте у специалиста."
              : "⚠ Дуже приблизна оцінка. У реальності — інакше. Уточнюйте у спеціаліста."}
          </p>
        </div>

        <div className="min-h-0 flex-1">{canvasBlock}</div>

        <div className="mt-3 space-y-2.5">
          <label className="block text-[11px] text-muted-ui">
            {isRu ? "Дистанция" : "Дистанція"}:{" "}
            <strong className="text-primary">
              {Math.round(inputs.distanceM)} м
            </strong>
            <input
              type="range"
              min={DIST_MIN_M}
              max={Math.min(distMax, 1200)}
              step={10}
              value={Math.min(inputs.distanceM, distMax, 1200)}
              onChange={(e) => patch({ distanceM: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--accent)]"
            />
          </label>

          <div className="flex items-center gap-2">
            {(
              [
                ["whitehot", "WH"],
                ["ironhot", "RH"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPalette(k)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-[11px] font-semibold",
                  palette === k
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary hover:border-white/20"
                )}
              >
                {lab}
              </button>
            ))}
            <span className="ml-auto text-[11px] tabular-nums text-faint">
              D≈{Math.round(computed.dri.detectM)} м
            </span>
          </div>

          <NextLink
            href="/simulator"
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[rgba(225,29,42,0.14)] px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-[var(--accent)] hover:bg-[rgba(225,29,42,0.22)]"
          >
            {isRu ? "Полный симулятор" : "Повний симулятор"}
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </NextLink>
        </div>
      </div>
    );
  }

  /* ── Full /simulator page ────────────────────────────────────── */
  return (
    <div className={cn("space-y-5", className)}>
      <div
        role="note"
        className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 px-4 py-3.5 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
          <SimulatorInfoPopover isRu={isRu} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
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

          {canvasBlock}

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

        <aside className="space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-ui">
            {isRu ? "Параметры" : "Параметри"}
          </h2>

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
