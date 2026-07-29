"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeDetectStatus,
  defaultDetectionRangeM,
  matrixClassPreset,
  matrixPixelWidth,
  netdContrast,
  netdNoiseAmp,
  pixelsOnTarget,
  type DetectStatus,
  type ThermalCompareOption,
  type ThermalMatrix,
  type ThermalSimParams,
} from "@/lib/thermal/parse-product-thermal";
import {
  atmosphericTransmission,
  deerScreenRect,
  defaultSimDistanceM,
  digitalZoomCrop,
  DIST_MIN_M,
} from "@/lib/thermal/zoom";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";
type Weather = "clear" | "fog";

/**
 * Two-layer thermal scene: a fixed-FOV forest background with a deer sprite
 * composited on the ground plane. The deer's apparent height and its feet row
 * both follow 1/distance, so it recedes toward the horizon honestly — no
 * baked-in scale, no floating cutout.
 */
export type ThermalScene = {
  id: string;
  labelUk: string;
  labelRu: string;
  /** Full-frame forest background (fixed field of view). */
  forest: string;
  /** Isolated deer on black — luminance-keyed into an alpha sprite. */
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

const LOGIC_W = 480;
const LOGIC_H = 270;
/** Working resolution of the trimmed deer sprite. */
const SPRITE_S = 512;
/** Digital-zoom presets (magnification of the sensor image). */
const ZOOM_STEPS = [1, 2, 4] as const;

type PanelKey = "current" | "slot0" | "slot1";

type Props = {
  params: ThermalSimParams;
  locale?: string;
  /** Catalog thermal products for dropdown (from SSR or empty → client fetch) */
  compareOptions?: ThermalCompareOption[];
  currentProductId?: string;
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
 * object-fit:cover, biased downward so the forest litter / ground plane
 * fills the bottom of the frame (tree canopy less, soil more).
 * Centered cover often crops the ground and makes the deer look mid-air.
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
  // Prefer lower source: more open ground, tree bases match HORIZON_FRAC
  const syMax = Math.max(0, ih - sh);
  const sy = Math.min(syMax, syMax * 0.72);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

/** Cool shadow + warm soil under hooves — reads as contact, not levitation. */
function drawGroundContact(
  ctx: CanvasRenderingContext2D,
  cx: number,
  feetY: number,
  deerW: number,
  trans: number
) {
  const rx = Math.max(6, deerW * 0.55);
  const ry = Math.max(3, deerW * 0.12);

  // Cool dark contact shadow (ground is colder under the body)
  const shadow = ctx.createRadialGradient(cx, feetY, 0, cx, feetY, rx);
  shadow.addColorStop(0, `rgba(4, 6, 10, ${0.72 * trans})`);
  shadow.addColorStop(0.45, `rgba(8, 10, 14, ${0.35 * trans})`);
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Slightly warmer soil print (body heat on litter)
  const warm = ctx.createRadialGradient(cx, feetY, 0, cx, feetY, rx * 0.55);
  warm.addColorStop(0, `rgba(220, 225, 230, ${0.28 * trans})`);
  warm.addColorStop(0.55, `rgba(140, 145, 155, ${0.1 * trans})`);
  warm.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = warm;
  ctx.beginPath();
  ctx.ellipse(cx, feetY, rx * 0.55, ry * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
}

type DeerSprite = {
  canvas: HTMLCanvasElement;
  /** Content bounding box inside the sprite canvas (trimmed to the animal). */
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  aspect: number;
};

/**
 * Luminance-key the isolated-deer JPEG into an RGBA sprite:
 * alpha = smoothstep over luminance (black background → transparent), and the
 * grayscale hot value is kept so the shared FX palette applies uniformly.
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
  const lo = 22;
  const hi = 74;
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
      const a = t * t * (3 - 2 * t); // smoothstep
      d[i] = d[i + 1] = d[i + 2] = l;
      d[i + 3] = Math.round(a * 255);
      if (a > 0.5) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(id, 0, 0);

  if (maxX <= minX || maxY <= minY) return null;

  // Refine feet row: lowest row that still has solid body pixels (a > 0.5).
  // Soft antler tips don't pull the bbox; hooves define the bottom edge.
  let feetY = maxY;
  for (let y = maxY; y >= minY; y--) {
    let solid = 0;
    for (let x = minX; x <= maxX; x++) {
      const i = (y * SPRITE_S + x) * 4;
      if (d[i + 3] > 140) solid++;
    }
    if (solid >= 3) {
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

type SlotState = {
  optionId: string | null;
  params: ThermalSimParams | null;
};

function optionToParams(o: ThermalCompareOption): ThermalSimParams {
  return {
    matrix: o.matrix,
    detectionRangeM: o.detectionRangeM,
    netdMk: o.netdMk,
    refreshRateHz: o.refreshRateHz,
    label: o.name,
  };
}

export function ThermalSimulator({
  params,
  locale = "uk",
  compareOptions: compareOptionsProp,
  currentProductId,
  allowMatrixPick = false,
  sceneId = "deer",
  className,
}: Props) {
  const isRu = locale === "ru";
  const scene = SCENES.find((s) => s.id === sceneId) || SCENES[0];

  const [distance, setDistance] = useState(() =>
    defaultSimDistanceM(params.detectionRangeM || 1200)
  );
  const [zoom, setZoom] = useState<number>(1);
  const [weather, setWeather] = useState<Weather>("clear");
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [matrix, setMatrix] = useState<ThermalMatrix>(params.matrix);
  const [compareOn, setCompareOn] = useState(false);
  const [slots, setSlots] = useState<SlotState[]>([
    { optionId: null, params: null },
    { optionId: null, params: null },
  ]);
  const [catalog, setCatalog] = useState<ThermalCompareOption[]>(
    compareOptionsProp || []
  );
  const [ready, setReady] = useState(false);

  const currentParams: ThermalSimParams = useMemo(
    () => ({
      ...params,
      matrix: allowMatrixPick ? matrix : params.matrix,
      label: params.label,
    }),
    [params, matrix, allowMatrixPick]
  );

  const activePanels = useMemo(() => {
    const list: { key: PanelKey; params: ThermalSimParams; title: string }[] = [
      {
        key: "current",
        params: currentParams,
        title: isRu ? "Этот прибор" : "Цей прилад",
      },
    ];
    if (compareOn) {
      slots.forEach((s, i) => {
        if (s.params) {
          list.push({
            key: i === 0 ? "slot0" : "slot1",
            params: s.params,
            title: s.params.label,
          });
        }
      });
    }
    return list;
  }, [currentParams, compareOn, slots, isRu]);

  const sliderMax = useMemo(() => {
    const ds = activePanels.map((p) => p.params.detectionRangeM);
    return Math.max(300, ...ds, currentParams.detectionRangeM);
  }, [activePanels, currentParams.detectionRangeM]);

  useEffect(() => {
    setMatrix(params.matrix);
  }, [params.matrix]);

  useEffect(() => {
    setDistance((d) => Math.min(d, sliderMax));
  }, [sliderMax]);

  // Catalog: SSR prop or client fetch
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
  const deerImg = useRef<HTMLImageElement | null>(null);
  const deerSprite = useRef<DeerSprite | null>(null);
  const composeRef = useRef<HTMLCanvasElement | null>(null);
  const matrixRef = useRef<HTMLCanvasElement | null>(null);

  // Load forest + deer, then build the keyed deer sprite once.
  useEffect(() => {
    let cancelled = false;
    let n = 0;
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
    load(scene.forest, forestImg);
    load(scene.deer, deerImg);
    return () => {
      cancelled = true;
    };
  }, [scene]);

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

      // ---- Layer 1: fixed-FOV forest (ground-biased cover) ----
      cctx.fillStyle = "#0a0b10";
      cctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      cctx.imageSmoothingEnabled = true;
      const forest = forestImg.current;
      if (forest && forest.complete && forest.naturalWidth > 0) {
        drawForestCover(cctx, forest, LOGIC_W, LOGIC_H);
      }

      // ---- Layer 2: deer on ground plane (height + feet both ∝ 1/d) ----
      const sprite = deerSprite.current;
      let focusXFrac = 0.5;
      let focusYFrac = 0.5;
      if (sprite) {
        // Sink hooves 1.5 px into soil so they never "hover" above litter
        const sink = Math.max(1, Math.round(LOGIC_H * 0.006));
        const rect = deerScreenRect(
          distance,
          LOGIC_W,
          LOGIC_H,
          sprite.aspect,
          DIST_MIN_M,
          sink
        );
        const trans = atmosphericTransmission(
          distance,
          panelParams.detectionRangeM,
          weather === "fog"
        );
        focusXFrac = rect.cx / LOGIC_W;
        // Focus digital zoom near body center, still above feet
        focusYFrac = (rect.feetY - rect.h * 0.35) / LOGIC_H;

        // Contact shadow + warm soil BEFORE the animal (depth: ground → deer)
        drawGroundContact(cctx, rect.cx, rect.feetY, rect.w, trans);

        // Atmospheric wash: distant deer blends toward background temperature.
        cctx.globalAlpha = 0.45 + 0.55 * trans;
        cctx.imageSmoothingEnabled = true;
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

      // ---- Unified sensor FX: contrast, NETD noise, palette ----
      const seed = hashSeed(
        scene.id,
        panelParams.matrix,
        panelParams.netdMk,
        panelParams.detectionRangeM,
        distance,
        weather,
        palette,
        panelSeedExtra,
        "v8-ground-plant"
      );
      const rand = mulberry32(seed);

      const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
      const d = imageData.data;
      const fog = weather === "fog";
      const noiseAmp = netdNoiseAmp(
        panelParams.netdMk,
        fog,
        distance,
        panelParams.detectionRangeM
      );
      const contrast = netdContrast(panelParams.netdMk, fog);
      const fogLift = fog ? 22 : 0;

      for (let i = 0; i < d.length; i += 4) {
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
          d[i] = rr;
          d[i + 1] = gg;
          d[i + 2] = bb;
        }
        d[i + 3] = 255;
      }
      cctx.putImageData(imageData, 0, 0);

      // ---- Sensor pixelation (matrix resolution) ----
      const pixW = matrixPixelWidth(panelParams.matrix);
      const pixH = Math.round(pixW * (LOGIC_H / LOGIC_W));

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

      // ---- Digital zoom: crop the sensor image + nearest-neighbor upscale ----
      const { sx, sy, sw, sh } = digitalZoomCrop(
        pixW,
        pixH,
        zoom,
        focusXFrac,
        focusYFrac
      );
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.drawImage(mCan, sx, sy, sw, sh, 0, 0, LOGIC_W, LOGIC_H);

      // ---- Scope vignette ----
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

      // ---- HUD ----
      ctx.fillStyle = "rgba(225,29,42,0.95)";
      ctx.font = "600 11px Manrope, system-ui, sans-serif";
      ctx.fillText(
        `${panelParams.matrix}×${Math.round(panelParams.matrix * 0.75)}`,
        12,
        20
      );
      ctx.fillStyle = "rgba(245,246,247,0.8)";
      ctx.fillText(`${distance} m`, 12, 36);
      ctx.fillText(
        `D ${panelParams.detectionRangeM} · NETD ${panelParams.netdMk}`,
        12,
        52
      );
      if (panelParams.refreshRateHz) {
        ctx.fillText(`${panelParams.refreshRateHz} Hz`, 12, 68);
      }
      if (zoom > 1) {
        ctx.fillStyle = "rgba(245,246,247,0.9)";
        ctx.textAlign = "right";
        ctx.fillText(`×${zoom}`, LOGIC_W - 12, 20);
        ctx.textAlign = "left";
      }
    },
    [scene, distance, zoom, weather, palette]
  );

  useEffect(() => {
    if (!ready) return;
    for (const panel of activePanels) {
      const canvas = canvasMap.current.get(panel.key) || null;
      renderPanel(canvas, panel.params, panel.key);
    }
  }, [ready, activePanels, renderPanel, distance, zoom, weather, palette]);

  const setSlotFromOption = (slotIndex: number, optionId: string) => {
    if (!optionId) {
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = { optionId: null, params: null };
        return next;
      });
      return;
    }
    if (optionId.startsWith("preset:")) {
      const m = Number(optionId.replace("preset:", "")) as ThermalMatrix;
      const preset = matrixClassPreset(m);
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = {
          optionId,
          params: {
            ...preset,
            label:
              (isRu ? "Класс " : "Клас ") +
              preset.label +
              (isRu ? " (типовой)" : " (типовий)"),
          },
        };
        return next;
      });
      return;
    }
    const opt = catalog.find((c) => c.id === optionId);
    if (!opt) return;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { optionId, params: optionToParams(opt) };
      return next;
    });
  };

  const addPreset = (m: ThermalMatrix) => {
    setCompareOn(true);
    setSlots((prev) => {
      const empty = prev.findIndex((s) => !s.params);
      const idx = empty >= 0 ? empty : 0;
      const next = [...prev];
      const preset = matrixClassPreset(m);
      next[idx] = {
        optionId: `preset:${m}`,
        params: {
          ...preset,
          label:
            (isRu ? "Класс " : "Клас ") +
            preset.label +
            (isRu ? " (типовой)" : " (типовий)"),
        },
      };
      return next;
    });
  };

  const panelStatus = (p: ThermalSimParams) => {
    const status = computeDetectStatus({
      distanceM: distance,
      maxRangeM: p.detectionRangeM,
      fog: weather === "fog",
    });
    let px = pixelsOnTarget(distance, p.detectionRangeM);
    if (weather === "fog") px *= 0.6;
    return { status, px };
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
        </div>
      </div>

      {/* Panels */}
      <div
        className={cn(
          "grid gap-4",
          activePanels.length === 1 && "grid-cols-1",
          activePanels.length === 2 && "grid-cols-1 md:grid-cols-2",
          activePanels.length >= 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {activePanels.map((panel) => {
          const { status, px } = panelStatus(panel.params);
          const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
          return (
            <div key={panel.key}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-ui">
                  {panel.title}
                  <span className="ml-2 normal-case text-faint">
                    {panel.params.matrix} · D={panel.params.detectionRangeM} ·
                    NETD {panel.params.netdMk}
                  </span>
                </p>
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      STATUS_COLOR[status]
                    )}
                  >
                    {statusLabel}
                  </span>
                  <p className="mt-0.5 text-[10px] tabular-nums text-faint">
                    Johnson ≈ {px.toFixed(1)} px
                  </p>
                </div>
              </div>
              <div
                className="overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black"
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
                  style={{ aspectRatio: `${LOGIC_W} / ${LOGIC_H}` }}
                  role="img"
                  aria-label={`${panel.title}: ${statusLabel}, ${distance} m`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Shared controls */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium text-muted-ui">
              <span>
                {isRu
                  ? "Дистанция до цели (общая для всех панелей)"
                  : "Дистанція до цілі (спільна для всіх панелей)"}
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
                ? `Угловой размер цели ∝ 1/дистанция: на ${DIST_MIN_M} м олень крупный, к ${sliderMax} м уходит к горизонту и тонет в шуме.`
                : `Кутовий розмір цілі ∝ 1/дистанція: на ${DIST_MIN_M} м олень великий, до ${sliderMax} м іде до горизонту й тоне в шумі.`}
            </span>
          </label>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Цифровой зум" : "Цифровий зум"}
          </legend>
          <div className="flex gap-2">
            {ZOOM_STEPS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  zoom === z
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary hover:border-white/20"
                )}
              >
                ×{z}
              </button>
            ))}
          </div>
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
          <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={compareOn}
              onChange={(e) => {
                setCompareOn(e.target.checked);
                if (e.target.checked && !slots.some((s) => s.params)) {
                  addPreset(256);
                }
              }}
              className="rounded border-white/20"
            />
            {isRu ? "Сравнить модели" : "Порівняти моделі"}
          </label>
          {allowMatrixPick && (
            <label className="block text-xs text-muted-ui">
              {isRu ? "Матрица (этот прибор)" : "Матриця (цей прилад)"}
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

      {/* Compare builder */}
      {compareOn && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-xs font-medium text-muted-ui">
            {isRu
              ? "Выберите 1–2 прибора или быстрый класс матрицы"
              : "Оберіть 1–2 прилади або швидкий клас матриці"}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="self-center text-[11px] text-faint">
              {isRu ? "Классы:" : "Класи:"}
            </span>
            {([256, 384, 640] as ThermalMatrix[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => addPreset(m)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-[var(--accent)] hover:text-primary"
              >
                {m}
                <span className="ml-1 font-normal text-faint">
                  D={defaultDetectionRangeM(m)}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <label key={i} className="block text-xs text-muted-ui">
                {isRu ? `Панель ${i + 2}` : `Панель ${i + 2}`}
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#12141a] px-2 py-2 text-sm text-primary"
                  value={slots[i]?.optionId || ""}
                  onChange={(e) => setSlotFromOption(i, e.target.value)}
                >
                  <option value="">
                    {isRu ? "— не выбрано —" : "— не обрано —"}
                  </option>
                  <optgroup label={isRu ? "Классы матриц" : "Класи матриць"}>
                    <option value="preset:256">
                      256×192 · D=1050 · NETD 40 (типовий)
                    </option>
                    <option value="preset:384">
                      384×288 · D=1600 · NETD 35 (типовий)
                    </option>
                    <option value="preset:640">
                      640×512 · D=2350 · NETD 25 (типовий)
                    </option>
                  </optgroup>
                  {catalogFiltered.length > 0 && (
                    <optgroup
                      label={isRu ? "Товары каталога" : "Товари каталогу"}
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
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        {isRu
          ? "Критерий Джонсона: px = 2×(D/dist) — выявление ≥2, распознавание ≥8, идентификация ≥13. Размер цели ← 1/дистанция; шум ← NETD; пикселизация ← матрица; цифровой зум кропает кадр без новой детализации. Кадр 480×270, seeded noise — одинаково на всех устройствах."
          : "Критерій Джонсона: px = 2×(D/dist) — виявлення ≥2, розпізнавання ≥8, ідентифікація ≥13. Розмір цілі ← 1/дистанція; шум ← NETD; пікселізація ← матриця; цифровий зум кропає кадр без нової деталізації. Кадр 480×270, seeded noise — однаковий на всіх пристроях."}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-faint/90 border-t border-white/5 pt-2">
        {isRu
          ? "D — паспортная дальность выявления (производители часто указывают для человека); сцена демонстрирует оленя. Симуляция приблизительная, не заменяет полевые испытания."
          : "D — паспортна дальність виявлення (виробники часто вказують для людини); сцена демонструє оленя. Симуляція приблизна, не замінює польові випробування."}
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
