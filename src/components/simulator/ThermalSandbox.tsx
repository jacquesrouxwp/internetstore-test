"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThermalCompareOption } from "@/lib/thermal/parse-product-thermal";
import { netdContrast, netdNoiseAmp } from "@/lib/thermal/parse-product-thermal";
import {
  DIGI_ZOOM_STEPS,
  digitalZoomCrop,
  DIST_MIN_M,
  deerFeetYFrac,
  inspectDigiZoom,
  nextDigiZoom,
} from "@/lib/thermal/zoom";
import {
  INPUT_LIMITS,
  MATRIX_PRESETS,
  PITCH_OPTIONS,
  TARGET_SIZE_M,
  TARGET_SUBJECT_SRC,
  calibrationRs75DetectM,
  clampSandboxInputs,
  computeSandbox,
  sandboxMatrixPixelWidth,
  sandboxOpticsHeightFrac,
  TARGET_VISUAL_HEIGHT_M,
  type PixelPitchUm,
  type SandboxInputs,
  type SandboxMatrix,
  type TargetKind,
} from "@/lib/thermal/sandbox-physics";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";

const LOGIC_W = 480;
const LOGIC_H = 360; // 4:3 thermal sensor
const SPRITE_S = 512;
const FOREST_LUMA_SCALE = 0.32;
const FOREST_LUMA_MAX = 0.38;

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

function applyThermalPalette(
  data: Uint8ClampedArray,
  palette: Palette,
  mode: "cold" | "hot",
  respectAlpha = false
) {
  for (let i = 0; i < data.length; i += 4) {
    if (respectAlpha && data[i + 3] < 8) continue;
    let L = lumaOf(data[i], data[i + 1], data[i + 2]) / 255;
    if (mode === "cold") L = Math.min(FOREST_LUMA_MAX, L * FOREST_LUMA_SCALE);
    if (mode === "hot") L = Math.pow(Math.max(0, Math.min(1, L)), 0.92);
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

type DeerSprite = {
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  aspect: number;
};

function buildDeerSprite(img: HTMLImageElement): DeerSprite | null {
  const c = document.createElement("canvas");
  c.width = SPRITE_S;
  c.height = SPRITE_S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, SPRITE_S, SPRITE_S);
  ctx.drawImage(img, 0, 0, SPRITE_S, SPRITE_S);
  const id = ctx.getImageData(0, 0, SPRITE_S, SPRITE_S);
  const d = id.data;
  let minX = SPRITE_S,
    maxX = 0,
    minY = SPRITE_S,
    maxY = 0;
  for (let y = 0; y < SPRITE_S; y++) {
    for (let x = 0; x < SPRITE_S; x++) {
      const i = (y * SPRITE_S + x) * 4;
      const l = lumaOf(d[i], d[i + 1], d[i + 2]);
      let t = (l - 18) / 52;
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

/** Map catalog product → approximate sandbox inputs. */
function presetFromCatalog(o: ThermalCompareOption): Partial<SandboxInputs> {
  const w = (o.matrix >= 640 ? 640 : o.matrix >= 384 ? 384 : 256) as SandboxMatrix;
  // Infer focal from D roughly: D ≈ K*target*f/(2*pitch) → f ≈ D*2*pitch/(K*target)
  const pitch = 12;
  const k = INPUT_LIMITS.kDefault;
  const target = 0.75;
  const fEst =
    (o.detectionRangeM * 2 * (pitch / 1000)) / (k * target);
  return {
    matrixW: w,
    pitchUm: 12,
    netdMk: o.netdMk,
    focalMm: Math.max(13, Math.min(100, Math.round(fEst))),
    target: "human",
    distanceM: Math.min(400, o.detectionRangeM),
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
      target: "deer",
      distanceM: 300,
      fog: false,
      kCalib: INPUT_LIMITS.kDefault,
    })
  );
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [digiZoom, setDigiZoom] = useState(1);
  const [hz, setHz] = useState<25 | 30 | 50>(50);
  const [ready, setReady] = useState(false);
  const [presetId, setPresetId] = useState("");

  const computed = useMemo(() => computeSandbox(inputs), [inputs]);
  const distMax = Math.max(
    DIST_MIN_M + 50,
    Math.round(computed.dri.detectM)
  );

  // Keep distance within new D_detect when optics change
  useEffect(() => {
    setInputs((prev) => {
      const next = clampSandboxInputs({ ...prev, distanceM: prev.distanceM });
      if (next.distanceM !== prev.distanceM) return next;
      return prev;
    });
  }, [inputs.focalMm, inputs.pitchUm, inputs.matrixW, inputs.target, inputs.kCalib]);

  const patch = useCallback((p: Partial<SandboxInputs>) => {
    setInputs((prev) => clampSandboxInputs({ ...prev, ...p }));
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const forestImg = useRef<HTMLImageElement | null>(null);
  const deerImg = useRef<HTMLImageElement | null>(null);
  const deerSprite = useRef<DeerSprite | null>(null);
  const composeRef = useRef<HTMLCanvasElement | null>(null);
  const subjectRef = useRef<HTMLCanvasElement | null>(null);
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
    load("/thermal/forest_whitehot.jpg", forestImg);
    load(TARGET_SUBJECT_SRC[inputs.target], deerImg);
    return () => {
      cancelled = true;
    };
  }, [inputs.target]);

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

    // Forest cold
    cctx.fillStyle = "#0a0b10";
    cctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    cctx.imageSmoothingEnabled = true;
    if (forestImg.current?.complete && forestImg.current.naturalWidth > 0) {
      drawForestCover(cctx, forestImg.current, LOGIC_W, LOGIC_H);
    }
    {
      const fd = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
      applyThermalPalette(fd.data, palette, "cold", false);
      cctx.putImageData(fd, 0, 0);
    }

    const sprite = deerSprite.current;
    let focusX = 0.5;
    let focusY = 0.75;
    if (sprite) {
      if (!subjectRef.current) subjectRef.current = document.createElement("canvas");
      const sub = subjectRef.current;
      sub.width = LOGIC_W;
      sub.height = LOGIC_H;
      const sctx = sub.getContext("2d", { willReadFrequently: true });
      if (sctx) {
        sctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
        // Size from optics FOV × body height — fog must not move/resize target
        const hFrac = sandboxOpticsHeightFrac(
          TARGET_VISUAL_HEIGHT_M[inputs.target],
          inputs.distanceM,
          inputs.matrixH,
          inputs.pitchUm,
          inputs.focalMm,
          1
        );
        const h = Math.max(1, hFrac * LOGIC_H);
        const w = Math.max(1, h * sprite.aspect);
        const feetY = deerFeetYFrac(inputs.distanceM) * LOGIC_H + 1;
        const cx = LOGIC_W * 0.5;
        const x = cx - w / 2;
        const y = feetY - h;
        focusX = cx / LOGIC_W;
        focusY = (y + h * 0.45) / LOGIC_H;

        // Alpha from range only (fog = noise/contrast/status, not geometry)
        const t =
          1 -
          0.78 *
            Math.min(1, Math.max(0, (inputs.distanceM - 50) / Math.max(1, detM - 50)));
        const trans = Math.max(0.25, t);

        // Cool ground contact (same idea as PDP) — before hot subject
        {
          const rx = Math.max(3, w * 0.55);
          const ry = Math.max(2, w * 0.14);
          const shadow = cctx.createRadialGradient(cx, feetY, 0, cx, feetY, rx);
          shadow.addColorStop(0, `rgba(4, 6, 10, ${0.75 * trans})`);
          shadow.addColorStop(0.5, `rgba(8, 10, 14, ${0.32 * trans})`);
          shadow.addColorStop(1, "rgba(0,0,0,0)");
          cctx.fillStyle = shadow;
          cctx.beginPath();
          cctx.ellipse(cx, feetY + 1, rx, ry, 0, 0, Math.PI * 2);
          cctx.fill();
        }

        sctx.globalAlpha = 0.4 + 0.6 * trans;
        sctx.imageSmoothingEnabled = h > 8;
        sctx.drawImage(
          sprite.canvas,
          sprite.cx,
          sprite.cy,
          sprite.cw,
          sprite.ch,
          x,
          y,
          w,
          h
        );
        sctx.globalAlpha = 1;
        const sd = sctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
        applyThermalPalette(sd.data, palette, "hot", true);
        sctx.putImageData(sd, 0, 0);
        cctx.drawImage(sub, 0, 0);
      }
    }

    // NETD noise
    const seed = hashSeed(
      inputs.matrixW,
      inputs.pitchUm,
      inputs.focalMm,
      inputs.netdMk,
      inputs.distanceM,
      fog,
      palette,
      "sandbox-v1"
    );
    const rand = mulberry32(seed);
    const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
    const d = imageData.data;
    const noiseAmp = netdNoiseAmp(
      inputs.netdMk,
      fog,
      inputs.distanceM,
      detM
    );
    const contrast = netdContrast(inputs.netdMk, fog);
    for (let i = 0; i < d.length; i += 4) {
      let y = lumaOf(d[i], d[i + 1], d[i + 2]);
      const n = (rand() - 0.5) * noiseAmp * 0.85;
      if (palette === "whitehot") {
        y = (y - 128) * (0.92 + 0.08 * contrast) + 128 + (fog ? 8 : 0) + n;
        y = Math.max(0, Math.min(255, y));
        d[i] = d[i + 1] = d[i + 2] = y;
      } else {
        const wasCold = d[i] + d[i + 1] < 120 && y < 100;
        y = Math.max(0, Math.min(255, y + n));
        if (wasCold) {
          const Lcold = Math.min(FOREST_LUMA_MAX, (y / 255) * 0.9);
          const [rr, gg, bb] = ironLut(Lcold);
          d[i] = rr;
          d[i + 1] = gg;
          d[i + 2] = bb;
        } else {
          d[i] = Math.max(0, Math.min(255, d[i] + n * 0.6));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.5));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.4));
        }
      }
      d[i + 3] = 255;
    }
    cctx.putImageData(imageData, 0, 0);

    const pixW = sandboxMatrixPixelWidth(inputs.matrixW);
    const pixH = Math.round(pixW * (3 / 4));
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

    const grd = ctx.createRadialGradient(
      LOGIC_W / 2,
      LOGIC_H / 2,
      LOGIC_H * 0.28,
      LOGIC_W / 2,
      LOGIC_H / 2,
      LOGIC_H * 0.78
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

    ctx.fillStyle = "rgba(225,29,42,0.95)";
    ctx.font = "600 11px Manrope, system-ui, sans-serif";
    ctx.fillText(`${inputs.matrixW}×${inputs.matrixH}`, 12, 20);
    ctx.fillStyle = "rgba(245,246,247,0.85)";
    ctx.fillText(`${Math.round(inputs.distanceM)} m`, 12, 36);
    ctx.fillText(
      `${inputs.focalMm} mm · ${inputs.pitchUm} µm · NETD ${inputs.netdMk}`,
      12,
      52
    );
    ctx.fillText(`${hz} Hz · FOV ${computed.fovDeg.toFixed(1)}°`, 12, 68);
    if (digiZoom > 1) {
      ctx.fillStyle = "rgba(225,29,42,0.95)";
      ctx.textAlign = "right";
      ctx.fillText(`DIGI ×${digiZoom}`, LOGIC_W - 12, 20);
      ctx.textAlign = "left";
    }
  }, [ready, inputs, palette, digiZoom, hz, computed]);

  useEffect(() => {
    render();
  }, [render]);

  const statusLabel = isRu
    ? STATUS_RU[computed.status]
    : STATUS_UK[computed.status];

  const applyPreset = (id: string) => {
    setPresetId(id);
    if (!id) return;
    if (id === "rs75") {
      patch({
        matrixW: 1280,
        pitchUm: 12,
        netdMk: 20,
        focalMm: 75,
        target: "human",
        kCalib: INPUT_LIMITS.kDefault,
        distanceM: 800,
      });
      return;
    }
    const o = catalogPresets.find((p) => p.id === id);
    if (o) patch(presetFromCatalog(o));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* Main: canvas + digi controls */}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              {isRu ? "Песочница тепловизора" : "Пісочниця тепловізора"}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {isRu
                ? "Экспертный конструктор: матрица, pitch, NETD, объектив → FOV, IFOV, DRI (Джонсон) и живая сцена."
                : "Експертний конструктор: матриця, pitch, NETD, об'єктив → FOV, IFOV, DRI (Джонсон) і жива сцена."}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              STATUS_COLOR[computed.status]
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
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-[11px] font-semibold text-white">
                ×{digiZoom}
              </span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                disabled={digiZoom >= 16}
                onClick={() => setDigiZoom(nextDigiZoom(digiZoom, 1))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="pointer-events-auto rounded-md border border-[var(--accent)]/80 bg-[rgba(225,29,42,0.85)] px-2.5 py-1.5 text-[11px] font-bold uppercase text-white"
              onClick={() => {
                const z = inspectDigiZoom(inputs.distanceM);
                setDigiZoom(digiZoom >= z && digiZoom > 1 ? 1 : z);
              }}
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

        {/* Live calc panel */}
        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <CalcItem
            label="FOV H"
            value={`${computed.fovDeg.toFixed(2)}°`}
          />
          <CalcItem
            label="IFOV"
            value={`${computed.ifovMrad.toFixed(3)} mrad`}
          />
          <CalcItem
            label={isRu ? "Пикс. на цели" : "Пікс. на цілі"}
            value={`${computed.pixelsOnTarget.toFixed(1)} px`}
          />
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
            label={isRu ? "Ширина сенсора" : "Ширина сенсора"}
            value={`${computed.sensorWidthMm.toFixed(2)} мм`}
          />
          <CalcItem label="K" value={inputs.kCalib.toFixed(2)} />
          <CalcItem
            label={isRu ? "Статус" : "Статус"}
            value={statusLabel}
          />
        </div>

        {computed.atypical && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {isRu
              ? "⚠ Нетипичная конфигурация (очень высокая расчётная дальность). В реальных приборах атмосферы, ΔT и оптика ограничивают результат."
              : "⚠ Нетипова конфігурація (дуже висока розрахункова дальність). У реальних приладах атмосфера, ΔT і оптика обмежують результат."}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-faint">
          {isRu
            ? "Упрощённая модель по критерию Джонсона. Не учитывает атмосферу, влажность и тепловой контраст цели (ΔT). Частота кадров и разрешение дисплея — справочно, на симуляцию не влияют. Цифровой зум не добавляет деталей. Симуляция приблизительная, не замена полевых испытаний."
            : "Спрощена модель за критерієм Джонсона. Не враховує атмосферу, вологість і тепловий контраст цілі (ΔT). Частота кадрів і роздільність дисплея — довідково, на симуляцію не впливають. Цифровий зум не додає деталей. Симуляція приблизна, не заміна польових випробувань."}
        </p>
        <p className="text-[10px] text-faint">
          {isRu
            ? `Калибровка K=${INPUT_LIMITS.kDefault}: RS75-класс 1280×1024 / 12µm / 75мм / человек 0.75м → D_det≈${Math.round(calibrationRs75DetectM())} м (паспорт ~3900 м).`
            : `Калібрування K=${INPUT_LIMITS.kDefault}: RS75-клас 1280×1024 / 12µm / 75мм / людина 0.75м → D_det≈${Math.round(calibrationRs75DetectM())} м (паспорт ~3900 м).`}
        </p>
      </div>

      {/* Controls */}
      <aside className="space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-ui">
          {isRu ? "Параметры сенсора" : "Параметри сенсора"}
        </h2>

        <label className="block text-xs text-muted-ui">
          {isRu ? "Пресет модели" : "Пресет моделі"}
          <select
            className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
            value={presetId}
            onChange={(e) => applyPreset(e.target.value)}
          >
            <option value="">
              {isRu ? "— вручную —" : "— вручну —"}
            </option>
            <option value="rs75">
              RS75-class · 1280×1024 · 12µm · 75mm (калибр.)
            </option>
            {catalogPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.matrix} · D≈{p.detectionRangeM}
              </option>
            ))}
          </select>
        </label>

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
          NETD: <strong className="text-primary">{inputs.netdMk} mK</strong>
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
          {isRu ? "Объектив (фокус)" : "Об'єктив (фокус)"}:{" "}
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
          {isRu ? "Цель" : "Ціль"}
          <select
            className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
            value={inputs.target}
            onChange={(e) =>
              patch({ target: e.target.value as TargetKind })
            }
          >
            <option value="deer">
              {isRu ? "Олень" : "Олень"} (~{TARGET_SIZE_M.deer} м)
            </option>
            <option value="boar">
              {isRu ? "Кабан" : "Кабан"} (~{TARGET_SIZE_M.boar} м)
            </option>
            <option value="fox">
              {isRu ? "Лисица" : "Лисиця"} (~{TARGET_SIZE_M.fox} м)
            </option>
            <option value="human">
              {isRu ? "Человек" : "Людина"} (~{TARGET_SIZE_M.human} м)
            </option>
          </select>
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

        <label className="block text-xs text-muted-ui">
          {isRu ? "Частота (подпись)" : "Частота (підпис)"}
          <select
            className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
            value={hz}
            onChange={(e) => setHz(Number(e.target.value) as 25 | 30 | 50)}
          >
            <option value={25}>25 Hz</option>
            <option value={30}>30 Hz</option>
            <option value={50}>50 Hz</option>
          </select>
        </label>

        <label className="block text-xs text-muted-ui">
          K ({isRu ? "калибровка DRI" : "калібрування DRI"}):{" "}
          <strong className="text-primary">{inputs.kCalib.toFixed(2)}</strong>
          <input
            type="range"
            min={INPUT_LIMITS.kMin}
            max={INPUT_LIMITS.kMax}
            step={0.01}
            value={inputs.kCalib}
            onChange={(e) => patch({ kCalib: Number(e.target.value) })}
            className="mt-1 w-full accent-[var(--accent)]"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
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
      </aside>
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
