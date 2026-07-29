"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeDetectStatus,
  defaultDetectionRangeM,
  matrixPixelWidth,
  netdContrast,
  netdNoiseAmp,
  pixelsOnTarget,
  type DetectStatus,
  type ThermalMatrix,
  type ThermalSimParams,
} from "@/lib/thermal/parse-product-thermal";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";
type Weather = "clear" | "fog";

/**
 * Unified scene: forest + subject composed once, then optical zoom
 * around hoof-ground anchor so subject never drifts relative to trees.
 */
export type ThermalScene = {
  id: string;
  labelUk: string;
  labelRu: string;
  forestWhite: string;
  forestIron: string;
  subjectWhite: string;
  subjectIron: string;
  /**
   * Anchor in scene UV (0–1): hoof contact with ground plane.
   * Must sit on forest floor / clearing, not mid-trunk.
   */
  anchorX: number;
  anchorY: number;
  /** Subject height as fraction of scene height (fixed in scene space) */
  subjectHeightFrac: number;
  /** Where the anchor lands in the view (0–1); keep = anchor for lock */
  viewAnchorX: number;
  viewAnchorY: number;
};

const SCENES: ThermalScene[] = [
  {
    id: "deer",
    labelUk: "Олень у лісі",
    labelRu: "Олень в лесу",
    forestWhite: "/thermal/forest_whitehot.jpg",
    forestIron: "/thermal/forest_ironhot.jpg",
    subjectWhite: "/thermal/deer_subject_whitehot.jpg",
    subjectIron: "/thermal/deer_subject_ironhot.jpg",
    // Ground plane of the forest clearing (foreground litter), trees behind.
    // Y high = lower in frame = soil, not trunks.
    anchorX: 0.5,
    anchorY: 0.91,
    subjectHeightFrac: 0.26,
    viewAnchorX: 0.5,
    viewAnchorY: 0.91,
  },
];

/** Fixed logical display size — pixel-identical on all devices */
const LOGIC_W = 480;
const LOGIC_H = 270;

/**
 * Internal scene buffer (forest + deer baked together).
 * Larger than view so zoom-in has detail and zoom-out still covers.
 */
const SCENE_W = 960;
const SCENE_H = 540;

/** Zoom multipliers: 50 m = max in, detectionRange = max out (cover scene) */
const ZOOM_NEAR = 2.45;
const ZOOM_FAR = 1.0;

type Props = {
  params: ThermalSimParams;
  locale?: string;
  allowMatrixPick?: boolean;
  sceneId?: string;
  className?: string;
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

const STATUS_HINT_UK: Record<DetectStatus, string> = {
  identify: "≥13 px на цілі",
  recognize: "≥8 px на цілі",
  detect: "≥2 px на цілі",
  none: "<2 px на цілі",
};
const STATUS_HINT_RU: Record<DetectStatus, string> = {
  identify: "≥13 px на цели",
  recognize: "≥8 px на цели",
  detect: "≥2 px на цели",
  none: "<2 px на цели",
};

const STATUS_COLOR: Record<DetectStatus, string> = {
  identify: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  recognize: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  detect: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  none: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
};

/** Deterministic PRNG (mulberry32) */
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
 * Forest cover biased slightly downward so ground plane fills the bottom
 * (open litter / clearing) and trunks sit mid/back, not under the deer.
 */
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
  // Prefer lower part of source: more ground, less sky canopy
  const sy = Math.min(ih - sh, Math.max(0, (ih - sh) * 0.55 + ih * 0.08));
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

/**
 * Find non-black content bbox so subject feet sit on the bottom edge
 * (no floating from letterbox padding).
 */
function contentBBox(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  thr = 18
): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  let found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum >= thr) {
        found = true;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (!found) return null;
  // Small pad so antlers/hooves aren't clipped
  const pad = 2;
  return {
    x0: Math.max(0, x0 - pad),
    y0: Math.max(0, y0 - pad),
    x1: Math.min(w - 1, x1 + pad),
    y1: Math.min(h - 1, y1 + pad),
  };
}

/**
 * Subject: black → transparent key, auto-cropped to content so hooves
 * land on the bottom of the draw rect (anchor = ground contact).
 */
function drawSubjectKeyed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih || dw < 1 || dh < 1) return;

  // Work at source resolution for accurate bbox, then scale to target
  const src = document.createElement("canvas");
  src.width = iw;
  src.height = ih;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) return;
  sctx.drawImage(img, 0, 0);
  const sid = sctx.getImageData(0, 0, iw, ih);
  const sd = sid.data;
  for (let i = 0; i < sd.length; i += 4) {
    const y = 0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2];
    if (y < 18) sd[i + 3] = 0;
    else if (y < 40) sd[i + 3] = Math.round(((y - 18) / 22) * 255);
  }
  sctx.putImageData(sid, 0, 0);

  const box = contentBBox(sd, iw, ih);
  const sx = box ? box.x0 : 0;
  const sy = box ? box.y0 : 0;
  const sw = box ? box.x1 - box.x0 + 1 : iw;
  const sh = box ? box.y1 - box.y0 + 1 : ih;

  // Preserve aspect of cropped subject inside target box; pin feet to bottom-center
  const aspect = sw / sh;
  let outH = dh;
  let outW = outH * aspect;
  if (outW > dw * 1.25) {
    outW = dw * 1.25;
    outH = outW / aspect;
  }
  const ox = dx + (dw - outW) / 2;
  const oy = dy + (dh - outH); // feet on bottom of target rect

  ctx.drawImage(src, sx, sy, sw, sh, ox, oy, outW, outH);
}

/**
 * Thermal ground contact under hooves: soft cool shadow + warm soil patch
 * so the animal reads as standing, not levitating.
 */
function drawGroundContact(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  subjW: number,
  palette: Palette
) {
  const rx = subjW * 0.48;
  const ry = Math.max(6, subjW * 0.11);

  // Cool contact shadow (darker ground)
  const shadow = ctx.createRadialGradient(ax, ay, 0, ax, ay, rx);
  if (palette === "whitehot") {
    shadow.addColorStop(0, "rgba(8, 10, 14, 0.72)");
    shadow.addColorStop(0.4, "rgba(12, 14, 18, 0.4)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  } else {
    shadow.addColorStop(0, "rgba(10, 6, 20, 0.7)");
    shadow.addColorStop(0.45, "rgba(20, 10, 30, 0.35)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  }
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(ax, ay + 1, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Slightly warmer soil at hoof print (body heat on litter)
  const warm = ctx.createRadialGradient(ax, ay - 1, 0, ax, ay, rx * 0.55);
  if (palette === "whitehot") {
    warm.addColorStop(0, "rgba(210, 214, 220, 0.28)");
    warm.addColorStop(0.55, "rgba(140, 145, 155, 0.12)");
    warm.addColorStop(1, "rgba(0, 0, 0, 0)");
  } else {
    warm.addColorStop(0, "rgba(255, 120, 40, 0.22)");
    warm.addColorStop(0.55, "rgba(180, 40, 60, 0.1)");
    warm.addColorStop(1, "rgba(0, 0, 0, 0)");
  }
  ctx.fillStyle = warm;
  ctx.beginPath();
  ctx.ellipse(ax, ay, rx * 0.55, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Soft forest-litter oval so the clearing under the deer reads as ground plane.
 */
function drawGroundClearing(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  subjW: number,
  palette: Palette
) {
  const rx = subjW * 1.15;
  const ry = subjW * 0.28;
  const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, rx);
  if (palette === "whitehot") {
    g.addColorStop(0, "rgba(55, 58, 65, 0.35)");
    g.addColorStop(0.5, "rgba(30, 32, 38, 0.2)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
  } else {
    g.addColorStop(0, "rgba(40, 30, 50, 0.3)");
    g.addColorStop(0.5, "rgba(25, 15, 35, 0.15)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(ax, ay + 2, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Bake forest + ground + deer into one scene buffer.
 * Hooves pinned to ground plane anchor — never mid-trunk.
 */
function composeScene(
  out: HTMLCanvasElement,
  forest: HTMLImageElement | null,
  subject: HTMLImageElement | null,
  scene: ThermalScene,
  palette: Palette
): boolean {
  out.width = SCENE_W;
  out.height = SCENE_H;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  ctx.fillStyle = "#0a0b10";
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  ctx.imageSmoothingEnabled = true;

  if (forest && forest.complete && forest.naturalWidth > 0) {
    drawForestCover(ctx, forest, SCENE_W, SCENE_H);
  }

  const ax = SCENE_W * scene.anchorX;
  const ay = SCENE_H * scene.anchorY;
  const subjH = SCENE_H * scene.subjectHeightFrac;
  // Wide enough target box; aspect fixed by crop inside drawSubjectKeyed
  const subjW = subjH * 1.15;
  const subjX = ax - subjW / 2;
  const subjY = ay - subjH;

  // Ground under deer first (depth: litter → contact → animal)
  drawGroundClearing(ctx, ax, ay, subjW, palette);
  drawGroundContact(ctx, ax, ay, subjW, palette);

  if (subject && subject.complete && subject.naturalWidth > 0) {
    drawSubjectKeyed(ctx, subject, subjX, subjY, subjW, subjH);
  } else {
    ctx.fillStyle = palette === "ironhot" ? "#ff6b1a" : "#e8eaed";
    ctx.beginPath();
    ctx.ellipse(
      ax,
      ay - subjH * 0.45,
      subjW * 0.28,
      subjH * 0.28,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  return true;
}

/**
 * Optical zoom of the whole scene around the hoof-ground anchor.
 * One transform only — subject, ground patch, and trees scale together.
 */
function drawSceneZoomed(
  ctx: CanvasRenderingContext2D,
  sceneCanvas: HTMLCanvasElement,
  scene: ThermalScene,
  /** 1 = 50 m (near), 0 = maxRange (far) */
  closeAmount: number,
  dw: number,
  dh: number
) {
  const zoom = ZOOM_FAR + closeAmount * (ZOOM_NEAR - ZOOM_FAR);

  const cover = Math.max(dw / SCENE_W, dh / SCENE_H);
  const scale = cover * zoom;

  const ax = SCENE_W * scene.anchorX;
  const ay = SCENE_H * scene.anchorY;
  const vx = dw * scene.viewAnchorX;
  const vy = dh * scene.viewAnchorY;

  let sw = dw / scale;
  let sh = dh / scale;
  let sx = ax - vx / scale;
  let sy = ay - vy / scale;

  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;
  if (sx + sw > SCENE_W) sx = Math.max(0, SCENE_W - sw);
  if (sy + sh > SCENE_H) sy = Math.max(0, SCENE_H - sh);
  sw = Math.min(sw, SCENE_W);
  sh = Math.min(sh, SCENE_H);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sceneCanvas, sx, sy, sw, sh, 0, 0, dw, dh);
}

export function ThermalSimulator({
  params,
  locale = "uk",
  allowMatrixPick = false,
  sceneId = "deer",
  className,
}: Props) {
  const isRu = locale === "ru";
  const maxRange = Math.max(300, params.detectionRangeM || defaultDetectionRangeM(params.matrix));
  const [distance, setDistance] = useState(() =>
    Math.min(400, Math.round(maxRange * 0.35))
  );
  const [weather, setWeather] = useState<Weather>("clear");
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [matrix, setMatrix] = useState<ThermalMatrix>(params.matrix);
  const [compare, setCompare] = useState(false);
  const [ready, setReady] = useState(false);

  const scene = SCENES.find((s) => s.id === sceneId) || SCENES[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWeakRef = useRef<HTMLCanvasElement>(null);
  const forestWhite = useRef<HTMLImageElement | null>(null);
  const forestIron = useRef<HTMLImageElement | null>(null);
  const subjWhite = useRef<HTMLImageElement | null>(null);
  const subjIron = useRef<HTMLImageElement | null>(null);
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const sceneKeyRef = useRef<string>("");
  const composeRef = useRef<HTMLCanvasElement | null>(null);
  const matrixRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMatrix(params.matrix);
    setDistance((d) => Math.min(d, maxRange));
  }, [params.matrix, maxRange]);

  useEffect(() => {
    let cancelled = false;
    let n = 0;
    const done = () => {
      n += 1;
      if (n >= 4 && !cancelled) {
        sceneKeyRef.current = "";
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
    load(scene.forestWhite, forestWhite);
    load(scene.forestIron, forestIron);
    load(scene.subjectWhite, subjWhite);
    load(scene.subjectIron, subjIron);
    return () => {
      cancelled = true;
    };
  }, [scene]);

  // Johnson: pixels on target for this product D
  const pxOnTarget = useMemo(() => {
    let px = pixelsOnTarget(distance, maxRange);
    if (weather === "fog") px *= 0.6;
    return px;
  }, [distance, maxRange, weather]);

  const status = useMemo(
    () =>
      computeDetectStatus({
        distanceM: distance,
        maxRangeM: maxRange,
        fog: weather === "fog",
      }),
    [distance, maxRange, weather]
  );

  // Weak compare: same distance, D for 256 matrix (honest range of weaker unit)
  const weakD = defaultDetectionRangeM(256);
  const statusWeak = useMemo(
    () =>
      computeDetectStatus({
        distanceM: distance,
        maxRangeM: weakD,
        fog: weather === "fog",
      }),
    [distance, weakD, weather]
  );

  const ensureScene = useCallback(() => {
    const key = `${scene.id}|${palette}|ground-v4`;
    if (sceneRef.current && sceneKeyRef.current === key) {
      return sceneRef.current;
    }
    if (!sceneRef.current) {
      sceneRef.current = document.createElement("canvas");
    }
    const forest =
      palette === "whitehot" ? forestWhite.current : forestIron.current;
    const subject =
      palette === "whitehot" ? subjWhite.current : subjIron.current;
    composeScene(sceneRef.current, forest, subject, scene, palette);
    sceneKeyRef.current = key;
    return sceneRef.current;
  }, [scene, palette]);

  const render = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      matrixUse: ThermalMatrix,
      netdUse: number,
      rangeForNoise: number
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (canvas.width !== LOGIC_W || canvas.height !== LOGIC_H) {
        canvas.width = LOGIC_W;
        canvas.height = LOGIC_H;
      }

      const sceneCanvas = ensureScene();

      if (!composeRef.current) {
        composeRef.current = document.createElement("canvas");
      }
      const compose = composeRef.current;
      compose.width = LOGIC_W;
      compose.height = LOGIC_H;
      const cctx = compose.getContext("2d", { willReadFrequently: true });
      if (!cctx) return;

      cctx.fillStyle = "#0a0b10";
      cctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

      const t = Math.max(
        0,
        Math.min(1, (distance - 50) / Math.max(1, maxRange - 50))
      );
      const closeAmount = 1 - Math.pow(t, 0.9);

      drawSceneZoomed(
        cctx,
        sceneCanvas,
        scene,
        closeAmount,
        LOGIC_W,
        LOGIC_H
      );

      // Deterministic FX after zoom
      const seed = hashSeed(
        scene.id,
        matrixUse,
        netdUse,
        distance,
        weather,
        palette,
        "v4-ground-johnson"
      );
      const rand = mulberry32(seed);

      const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
      const d = imageData.data;
      const fog = weather === "fog";
      const noiseAmp = netdNoiseAmp(netdUse, fog, distance, rangeForNoise);
      const contrast = netdContrast(netdUse, fog);
      const fogLift = fog ? 22 : 0;

      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let y = 0.299 * r + 0.587 * g + 0.114 * b;
        y = (y - 128) * contrast + 128 + fogLift;
        y += (rand() - 0.5) * noiseAmp;
        y = Math.max(0, Math.min(255, y));

        if (palette === "whitehot") {
          d[i] = d[i + 1] = d[i + 2] = y;
        } else {
          const [rr, gg, bb] = ironLut(y / 255);
          d[i] = Math.round(rr * 0.55 + r * 0.45);
          d[i + 1] = Math.round(gg * 0.55 + g * 0.45);
          d[i + 2] = Math.round(bb * 0.55 + b * 0.45);
        }
        d[i + 3] = 255;
      }
      cctx.putImageData(imageData, 0, 0);

      // Matrix pixelation (visual only)
      const pixW = matrixPixelWidth(matrixUse);
      const pixH = Math.round(pixW * (9 / 16));

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

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.drawImage(mCan, 0, 0, LOGIC_W, LOGIC_H);

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

      // HUD
      ctx.fillStyle = "rgba(225,29,42,0.95)";
      ctx.font = "600 11px Manrope, system-ui, sans-serif";
      ctx.fillText(`${matrixUse}×${Math.round(matrixUse * 0.75)}`, 12, 20);
      ctx.fillStyle = "rgba(245,246,247,0.8)";
      ctx.fillText(`${distance} m`, 12, 36);
      if (params.refreshRateHz) {
        ctx.fillText(`${params.refreshRateHz} Hz`, 12, 52);
      }
    },
    [
      palette,
      weather,
      distance,
      maxRange,
      params.refreshRateHz,
      scene,
      ensureScene,
    ]
  );

  useEffect(() => {
    if (!ready) return;
    render(canvasRef.current, matrix, params.netdMk, maxRange);
    if (compare) {
      render(
        canvasWeakRef.current,
        256,
        Math.max(params.netdMk, 40),
        weakD
      );
    }
  }, [
    ready,
    render,
    matrix,
    params.netdMk,
    compare,
    distance,
    weather,
    palette,
    maxRange,
    weakD,
  ]);

  const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
  const statusHint = isRu ? STATUS_HINT_RU[status] : STATUS_HINT_UK[status];

  return (
    <section
      className={cn(
        "thermal-sim rounded-[var(--radius-card)] border border-white/[0.1] p-5 sm:p-6",
        className
      )}
      style={{ background: "var(--surface)" }}
      aria-label={
        isRu ? "Симулятор тепловизора" : "Симулятор тепловізора"
      }
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
              ? `Матрица ${matrix}, NETD ≤${params.netdMk} mK, D=${maxRange} м (выявление) · ${scene.labelRu}`
              : `Матриця ${matrix}, NETD ≤${params.netdMk} mK, D=${maxRange} м (виявлення) · ${scene.labelUk}`}
          </p>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              STATUS_COLOR[status]
            )}
            role="status"
            aria-live="polite"
          >
            {statusLabel}
          </div>
          <p className="mt-1 text-[10px] tabular-nums text-faint">
            Johnson ≈ {pxOnTarget.toFixed(1)} px · {statusHint}
          </p>
        </div>
      </div>

      <div className={cn("grid gap-4", compare && "lg:grid-cols-2")}>
        <div>
          {compare && (
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-ui">
              {isRu ? "Ваш прибор" : "Ваш прилад"} · {matrix} · D={maxRange} м
            </p>
          )}
          <div
            className="overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black"
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
              style={{ aspectRatio: `${LOGIC_W} / ${LOGIC_H}` }}
              role="img"
              aria-label={
                isRu
                  ? `Тепловая сцена: ${scene.labelRu}, ${statusLabel}, ${distance} м`
                  : `Теплова сцена: ${scene.labelUk}, ${statusLabel}, ${distance} м`
              }
            />
          </div>
        </div>
        {compare && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-ui">
              {isRu ? "Слабее: 256" : "Слабше: 256"} · D={weakD} м ·{" "}
              {isRu ? STATUS_RU[statusWeak] : STATUS_UK[statusWeak]}
            </p>
            <div
              className="overflow-hidden rounded-xl border-2 border-zinc-800 bg-black"
              style={{ boxShadow: "0 0 0 3px #12141a" }}
            >
              <canvas
                ref={canvasWeakRef}
                width={LOGIC_W}
                height={LOGIC_H}
                className="block h-auto w-full"
                style={{ aspectRatio: `${LOGIC_W} / ${LOGIC_H}` }}
                role="img"
                aria-label={
                  isRu
                    ? "Сравнение со слабой матрицей"
                    : "Порівняння зі слабшою матрицею"
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium text-muted-ui">
              <span>{isRu ? "Дистанция" : "Дистанція"}</span>
              <span className="tabular-nums text-primary">
                {distance} м / D={maxRange} м
              </span>
            </span>
            <input
              type="range"
              min={50}
              max={maxRange}
              step={10}
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="thermal-range w-full"
              aria-valuemin={50}
              aria-valuemax={maxRange}
              aria-valuenow={distance}
              aria-label={isRu ? "Дистанция до цели" : "Дистанція до цілі"}
            />
            <span className="mt-1 block text-[11px] text-faint">
              {isRu
                ? `Олень стоит на земле (якорь — копыта). 50 м — крупно, ${maxRange} м (=D) — предел выявления (~2 px).`
                : `Олень стоїть на землі (якір — копита). 50 м — крупно, ${maxRange} м (=D) — межа виявлення (~2 px).`}
            </span>
          </label>
        </div>

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

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="rounded border-white/20"
            />
            {isRu
              ? "Сравнить со слабой матрицей 256"
              : "Порівняти зі слабшою матрицею 256"}
          </label>
          {allowMatrixPick && (
            <label className="block text-xs text-muted-ui">
              {isRu ? "Матрица" : "Матриця"}
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-1.5 text-sm text-primary"
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
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        {isRu
          ? "Критерий Джонсона: px = 2×(D/dist) — выявление ≥2, распознавание ≥8, идентификация ≥13. Шум ← NETD (+туман, +дистанция); пикселизация ← матрица. Цель видна при ΔT ≳ 2 °C с фоном. 50 Гц — плавность в движении (на статике не влияет). Кадр одинаковый на всех устройствах (480×270, seeded noise)."
          : "Критерій Джонсона: px = 2×(D/dist) — виявлення ≥2, розпізнавання ≥8, ідентифікація ≥13. Шум ← NETD (+туман, +дистанція); пікселізація ← матриця. Ціль видно при ΔT ≳ 2 °C з фоном. 50 Гц — плавність у русі (на статиці не впливає). Кадр однаковий на всіх пристроях (480×270, seeded noise)."}
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
