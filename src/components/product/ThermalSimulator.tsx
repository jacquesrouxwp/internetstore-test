"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeDetectStatus,
  matrixPixelWidth,
  type DetectStatus,
  type ThermalMatrix,
  type ThermalSimParams,
} from "@/lib/thermal/parse-product-thermal";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";
type Weather = "clear" | "fog";

/**
 * Layered scenes: forest (zooms with distance) + subject (static).
 * Add boar/human as new entries later.
 */
export type ThermalScene = {
  id: string;
  labelUk: string;
  labelRu: string;
  forestWhite: string;
  forestIron: string;
  subjectWhite: string;
  subjectIron: string;
  /** Feet line as fraction of frame height */
  groundY: number;
  subjectX: number;
  /** Fixed subject height as fraction of frame (does NOT change with distance) */
  subjectHeightFrac: number;
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
    groundY: 0.82,
    subjectX: 0.52,
    subjectHeightFrac: 0.55,
  },
];

/** Fixed logical display size — pixel-identical on all devices */
const LOGIC_W = 480;
const LOGIC_H = 270;

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
 * Draw forest with object-fit:cover and zoom.
 * zoom=1 → tightest crop (close / 50m), zoom=0 → widest view (far / maxRange).
 * Higher zoomIn factor = more magnified (less of the source visible).
 */
function drawForestZoom(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dw: number,
  dh: number,
  /** 0 = max distance (wide), 1 = 50m (zoomed in) */
  closeAmount: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;

  // Base cover scale
  const cover = Math.max(dw / iw, dh / ih);
  // At 50m (close=1): strong zoom-in; at max (close=0): mild cover
  const zoomMult = 1.05 + closeAmount * 1.35; // ~1.05 far … ~2.4 near
  const scale = cover * zoomMult;
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2 + (1 - closeAmount) * ih * 0.02;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

/** Subject: black → transparent key */
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

  const tmp = document.createElement("canvas");
  tmp.width = Math.max(1, Math.round(dw));
  tmp.height = Math.max(1, Math.round(dh));
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  if (!tctx) return;

  tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
  const id = tctx.getImageData(0, 0, tmp.width, tmp.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (y < 18) d[i + 3] = 0;
    else if (y < 40) d[i + 3] = Math.round(((y - 18) / 22) * 255);
  }
  tctx.putImageData(id, 0, 0);
  ctx.drawImage(tmp, dx, dy);
}

export function ThermalSimulator({
  params,
  locale = "uk",
  allowMatrixPick = false,
  sceneId = "deer",
  className,
}: Props) {
  const isRu = locale === "ru";
  const maxRange = Math.max(300, params.detectionRangeM || 1200);
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
      if (n >= 4 && !cancelled) setReady(true);
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

  const status = useMemo(
    () =>
      computeDetectStatus({
        distanceM: distance,
        maxRangeM: maxRange,
        matrix,
        netdMk: params.netdMk,
        fog: weather === "fog",
      }),
    [distance, maxRange, matrix, params.netdMk, weather]
  );

  const statusWeak = useMemo(
    () =>
      computeDetectStatus({
        distanceM: distance,
        maxRangeM: maxRange,
        matrix: 256,
        netdMk: Math.max(params.netdMk, 40),
        fog: weather === "fog",
      }),
    [distance, maxRange, params.netdMk, weather]
  );

  const render = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      matrixUse: ThermalMatrix,
      netdUse: number
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fixed logical size — CSS scales; content identical on all devices
      if (canvas.width !== LOGIC_W || canvas.height !== LOGIC_H) {
        canvas.width = LOGIC_W;
        canvas.height = LOGIC_H;
      }

      const forest =
        palette === "whitehot" ? forestWhite.current : forestIron.current;
      const subject =
        palette === "whitehot" ? subjWhite.current : subjIron.current;

      // ── 1) Compose at full logical resolution ──
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
      cctx.imageSmoothingEnabled = true;

      // Distance → forest zoom (INVERTED): near = zoomed in, far = zoomed out
      const t = Math.max(
        0,
        Math.min(1, (distance - 50) / Math.max(1, maxRange - 50))
      );
      // closeAmount: 1 at 50m, 0 at maxRange
      const closeAmount = 1 - Math.pow(t, 0.9);

      if (forest && forest.complete && forest.naturalWidth > 0) {
        drawForestZoom(cctx, forest, LOGIC_W, LOGIC_H, closeAmount);
      }

      // Static deer — fixed size & position on ground line
      const subjH = LOGIC_H * scene.subjectHeightFrac;
      const subjW = subjH * 0.85;
      const feetY = LOGIC_H * scene.groundY;
      const subjX = LOGIC_W * scene.subjectX - subjW / 2;
      const subjY = feetY - subjH;

      if (subject && subject.complete && subject.naturalWidth > 0) {
        drawSubjectKeyed(cctx, subject, subjX, subjY, subjW, subjH);
      } else {
        cctx.fillStyle = palette === "ironhot" ? "#ff6b1a" : "#e8eaed";
        cctx.beginPath();
        cctx.ellipse(
          subjX + subjW * 0.5,
          subjY + subjH * 0.55,
          subjW * 0.35,
          subjH * 0.28,
          0,
          0,
          Math.PI * 2
        );
        cctx.fill();
      }

      // ── 2) Deterministic FX (seeded noise) on full composite ──
      const seed = hashSeed(
        scene.id,
        matrixUse,
        netdUse,
        distance,
        weather,
        palette,
        "v2"
      );
      const rand = mulberry32(seed);

      const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
      const d = imageData.data;
      const fog = weather === "fog";
      const noiseAmp = (netdUse / 35) * (fog ? 1.55 : 1) * 26;
      const contrast = (40 / Math.max(netdUse, 15)) * (fog ? 0.68 : 1);
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

      // ── 3) Matrix pixelation: downscale → upscale nearest ──
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

      // Final: nearest-neighbor to fixed logical canvas
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.drawImage(mCan, 0, 0, LOGIC_W, LOGIC_H);

      // Vignette (deterministic, no random)
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
      scene.groundY,
      scene.subjectX,
      scene.subjectHeightFrac,
      scene.id,
    ]
  );

  useEffect(() => {
    if (!ready) return;
    render(canvasRef.current, matrix, params.netdMk);
    if (compare) {
      render(canvasWeakRef.current, 256, Math.max(params.netdMk, 40));
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
  ]);

  const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];

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
              ? `Симуляция: матрица ${matrix}, NETD ≤${params.netdMk} mK, до ${maxRange} м · ${scene.labelRu}`
              : `Симуляція: матриця ${matrix}, NETD ≤${params.netdMk} mK, до ${maxRange} м · ${scene.labelUk}`}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            STATUS_COLOR[status]
          )}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
        </div>
      </div>

      <div className={cn("grid gap-4", compare && "lg:grid-cols-2")}>
        <div>
          {compare && (
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-ui">
              {isRu ? "Ваш прибор" : "Ваш прилад"} · {matrix}
            </p>
          )}
          <div
            className="overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black"
            style={{
              boxShadow:
                "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Fixed internal 480×270; CSS scales width — same pixels everywhere */}
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
              {isRu ? "Слабее: 256" : "Слабше: 256"} ·{" "}
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
              <span className="tabular-nums text-primary">{distance} м</span>
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
                ? `Олень неподвижен; лес зумится. 50 м — крупный план, ${maxRange} м — широкий вид. Картинка одинаковая на всех устройствах.`
                : `Олень нерухомий; ліс зумиться. 50 м — крупний план, ${maxRange} м — широкий вид. Картинка однакова на всіх пристроях.`}
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
          ? "Симуляция: олень фиксирован, зум леса = дистанция. Пикселизация/NETD/туман — на финальном кадре. Один и тот же кадр на любом устройстве (seeded noise, 480×270)."
          : "Симуляція: олень фіксований, зум лісу = дистанція. Пікселізація/NETD/туман — на фінальному кадрі. Той самий кадр на будь-якому пристрої (seeded noise, 480×270)."}
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
