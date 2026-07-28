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

const SCENES: Record<
  string,
  { white: string; iron: string; labelUk: string; labelRu: string }
> = {
  deer: {
    white: "/thermal/deer_whitehot.jpg",
    iron: "/thermal/deer_ironhot.jpg",
    labelUk: "Олень у лісі",
    labelRu: "Олень в лесу",
  },
};

type Props = {
  params: ThermalSimParams;
  locale?: string;
  /** Allow user to override matrix for comparison (blog mode) */
  allowMatrixPick?: boolean;
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

function ironLut(v: number): [number, number, number] {
  // v 0..1 → ironbow-ish
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.25) {
    const k = t / 0.25;
    return [Math.round(20 + k * 40), Math.round(10 + k * 20), Math.round(40 + k * 120)];
  }
  if (t < 0.5) {
    const k = (t - 0.25) / 0.25;
    return [Math.round(60 + k * 140), Math.round(30 + k * 40), Math.round(160 - k * 100)];
  }
  if (t < 0.75) {
    const k = (t - 0.5) / 0.25;
    return [Math.round(200 + k * 55), Math.round(70 + k * 120), Math.round(60 - k * 40)];
  }
  const k = (t - 0.75) / 0.25;
  return [255, Math.round(190 + k * 65), Math.round(20 + k * 200)];
}

export function ThermalSimulator({
  params,
  locale = "uk",
  allowMatrixPick = false,
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
  const [sceneId] = useState("deer");
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWeakRef = useRef<HTMLCanvasElement>(null);
  const imgWhite = useRef<HTMLImageElement | null>(null);
  const imgIron = useRef<HTMLImageElement | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);

  // Sync matrix when product changes
  useEffect(() => {
    setMatrix(params.matrix);
    setDistance((d) => Math.min(d, maxRange));
  }, [params.matrix, maxRange]);

  // Load scene images once
  useEffect(() => {
    const scene = SCENES[sceneId];
    let cancelled = false;
    let loaded = 0;
    const done = () => {
      loaded += 1;
      if (loaded >= 2 && !cancelled) setReady(true);
    };
    const w = new Image();
    const i = new Image();
    w.crossOrigin = "anonymous";
    i.crossOrigin = "anonymous";
    w.onload = done;
    i.onload = done;
    w.onerror = done;
    i.onerror = done;
    w.src = scene.white;
    i.src = scene.iron;
    imgWhite.current = w;
    imgIron.current = i;
    return () => {
      cancelled = true;
    };
  }, [sceneId]);

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

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || 640;
      const cssH = Math.round(cssW * (9 / 16));
      if (canvas.width !== Math.round(cssW * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const img =
        palette === "whitehot" ? imgWhite.current : imgIron.current;
      const hasImg = img && img.complete && img.naturalWidth > 0;

      // Cold background
      ctx.fillStyle = "#0a0b10";
      ctx.fillRect(0, 0, cssW, cssH);

      // Target scale from distance
      const scale = Math.max(
        0.08,
        Math.min(1, maxRange / Math.max(distance, 50) / 2.2)
      );

      const pixW = matrixPixelWidth(matrixUse);
      const pixH = Math.round(pixW * (9 / 16));

      if (!offRef.current) {
        offRef.current = document.createElement("canvas");
      }
      const off = offRef.current;
      off.width = pixW;
      off.height = pixH;
      const octx = off.getContext("2d");
      if (!octx) return;

      octx.fillStyle = "#0a0b10";
      octx.fillRect(0, 0, pixW, pixH);

      if (hasImg) {
        // Draw scene centered at reduced size for distance
        const drawW = pixW * scale;
        const drawH = pixH * scale;
        const dx = (pixW - drawW) / 2;
        const dy = (pixH - drawH) / 2 + pixH * 0.04 * (1 - scale);
        octx.imageSmoothingEnabled = true;
        octx.drawImage(img, dx, dy, drawW, drawH);
      } else {
        // Fallback silhouette
        octx.fillStyle = palette === "ironhot" ? "#e85d04" : "#d0d4dc";
        const cx = pixW / 2;
        const cy = pixH / 2 + 4;
        const s = scale;
        octx.beginPath();
        octx.ellipse(cx, cy + 8 * s, 28 * s, 18 * s, 0, 0, Math.PI * 2);
        octx.fill();
        octx.beginPath();
        octx.ellipse(cx + 22 * s, cy - 6 * s, 12 * s, 10 * s, 0, 0, Math.PI * 2);
        octx.fill();
      }

      // Pixel ops: fog, NETD noise, contrast
      const imageData = octx.getImageData(0, 0, pixW, pixH);
      const d = imageData.data;
      const fog = weather === "fog";
      const noiseAmp = (netdUse / 35) * (fog ? 1.55 : 1) * 28;
      const contrast = (40 / Math.max(netdUse, 15)) * (fog ? 0.65 : 1);
      const fogLift = fog ? 28 : 0;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        // luminance
        let y = 0.299 * r + 0.587 * g + 0.114 * b;
        // contrast around mid
        y = (y - 128) * contrast + 128 + fogLift;
        // noise
        y += (Math.random() - 0.5) * noiseAmp;
        y = Math.max(0, Math.min(255, y));

        if (palette === "whitehot") {
          d[i] = d[i + 1] = d[i + 2] = y;
        } else {
          // If base was iron image, still re-map for consistency under distance/fog
          const [rr, gg, bb] = ironLut(y / 255);
          d[i] = rr;
          d[i + 1] = gg;
          d[i + 2] = bb;
        }
        d[i + 3] = 255;
      }
      octx.putImageData(imageData, 0, 0);

      // Upscale nearest-neighbor → matrix pixels
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, cssW, cssH);

      // Display bezel vignette
      const grd = ctx.createRadialGradient(
        cssW / 2,
        cssH / 2,
        cssH * 0.25,
        cssW / 2,
        cssH / 2,
        cssH * 0.75
      );
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cssW, cssH);

      // HUD corner
      ctx.fillStyle = "rgba(225,29,42,0.9)";
      ctx.font = "600 11px Manrope, system-ui, sans-serif";
      ctx.fillText(`${matrixUse} × ${Math.round(matrixUse * 0.75)}`, 12, 20);
      ctx.fillStyle = "rgba(245,246,247,0.75)";
      ctx.fillText(`${distance} m`, 12, 36);
      if (params.refreshRateHz) {
        ctx.fillText(`${params.refreshRateHz} Hz`, 12, 52);
      }
    },
    [palette, weather, distance, maxRange, params.refreshRateHz]
  );

  // Redraw only when controls change
  useEffect(() => {
    if (!ready) return;
    render(canvasRef.current, matrix, params.netdMk);
    if (compare) {
      render(canvasWeakRef.current, 256, Math.max(params.netdMk, 40));
    }
  }, [ready, render, matrix, params.netdMk, compare, distance, weather, palette]);

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      render(canvasRef.current, matrix, params.netdMk);
      if (compare) render(canvasWeakRef.current, 256, Math.max(params.netdMk, 40));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [render, matrix, params.netdMk, compare]);

  const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
  const scene = SCENES[sceneId];

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
              ? `Симуляция по характеристикам: матрица ${matrix}, NETD ≤${params.netdMk} mK, дальность до ${maxRange} м`
              : `Симуляція за характеристиками: матриця ${matrix}, NETD ≤${params.netdMk} mK, дальність до ${maxRange} м`}
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
            className="overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]"
            style={{ boxShadow: "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5)" }}
          >
            <canvas
              ref={canvasRef}
              className="block w-full"
              style={{ aspectRatio: "16 / 9" }}
              role="img"
              aria-label={
                isRu
                  ? `Тепловая сцена: ${scene.labelRu}, ${statusLabel}`
                  : `Теплова сцена: ${scene.labelUk}, ${statusLabel}`
              }
            />
          </div>
        </div>
        {compare && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-ui">
              {isRu ? "Слабее: матрица 256" : "Слабше: матриця 256"} ·{" "}
              {isRu ? STATUS_RU[statusWeak] : STATUS_UK[statusWeak]}
            </p>
            <div
              className="overflow-hidden rounded-xl border-2 border-zinc-800 bg-black opacity-95"
              style={{ boxShadow: "0 0 0 3px #12141a" }}
            >
              <canvas
                ref={canvasWeakRef}
                className="block w-full"
                style={{ aspectRatio: "16 / 9" }}
                role="img"
                aria-label={isRu ? "Сравнение со слабой матрицей" : "Порівняння зі слабшою матрицею"}
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
                ? `Ваш прибор видит цель до ${maxRange} м (по спецификации)`
                : `Ваш прилад бачить ціль до ${maxRange} м (за специфікацією)`}
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
          ? "Симуляция приблизительная: пикселизация матрицы, шум NETD, туман и дистанция. Не заменяет полевые испытания."
          : "Симуляція наближена: пікселізація матриці, шум NETD, туман і дистанція. Не замінює польові випробування."}
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
