"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  computeDetectStatus,
  matrixClassPreset,
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
  digitalZoomCrop,
  DIST_MIN_M,
  subjectHeightFrac,
} from "@/lib/thermal/zoom";
import {
  crossoverM,
  gapPct,
  performanceAtDistance,
  pxOnTarget,
  scoreModelAtDistance,
  TARGET_FACTOR,
  TARGET_LABEL_RU,
  TARGET_LABEL_UK,
  THERMAL_TARGETS,
  type ScoreBreakdown,
  type ThermalTarget,
} from "@/lib/thermal/thermal-score-distance";
import {
  getThermalTarget,
  THERMAL_TARGETS as TARGET_DEFS,
} from "@/lib/thermal/targets";
import { cn } from "@/lib/utils";

type Palette = "whitehot" | "ironhot";
type Weather = "clear" | "fog";

/** Fixed-FOV forest plate (does not change with target). */
const FOREST_SRC = "/thermal/forest_whitehot.jpg";

/**
 * Subject sprites (luma-keyed on black). Shared with targets.ts paths so
 * switching the target button changes both Johnson px and the picture.
 */
const SUBJECT_SRC: Record<ThermalTarget, string> = {
  deer: "/thermal/deer_subject_whitehot.jpg",
  boar: "/thermal/subject_boar_whitehot.jpg",
  fox: "/thermal/subject_fox_whitehot.jpg",
  human: "/thermal/subject_human_whitehot.jpg",
};

const LOGIC_W = 480;
const LOGIC_H = 270;
/** Working resolution of the trimmed subject sprite. */
const SPRITE_S = 512;
/** Digital-zoom presets (magnification of the sensor image). */
const ZOOM_STEPS = [1, 2, 4] as const;

/** The two compared panels. A = left (default: this product), B = right. */
type PanelKey = "a" | "b";

type Props = {
  params: ThermalSimParams;
  locale?: string;
  /** Catalog thermal products for dropdown (from SSR or empty → client fetch) */
  compareOptions?: ThermalCompareOption[];
  currentProductId?: string;
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

/** Short HUD metric labels (localized) + English name for the hover tooltip.
 *  Only 3 productivity scores + Total — no Value for Money (price-free). */
const HUD_METRICS = {
  ru: {
    performance: ["Различимость", "Thermal Performance"],
    range: ["Дальность", "Detection Range"],
    image: ["Чёткость", "Image Quality"],
    total: ["Итог", "Total Score"],
  },
  uk: {
    performance: ["Розрізнення", "Thermal Performance"],
    range: ["Дальність", "Detection Range"],
    image: ["Чіткість", "Image Quality"],
    total: ["Разом", "Total Score"],
  },
} as const;

function scoreColor(v: number): string {
  if (v >= 75) return "#34d399"; // emerald
  if (v >= 50) return "#38bdf8"; // sky
  if (v >= 30) return "#fbbf24"; // amber
  return "#a1a1aa"; // zinc
}

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

/** object-fit:cover an image into a (dw, dh) target. */
function drawCover(
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
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
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
 * Luminance-key an isolated subject JPEG into an RGBA sprite:
 * alpha = smoothstep over luminance (black background → transparent), and the
 * grayscale hot value is kept so the shared FX palette applies uniformly.
 */
function buildSubjectSprite(img: HTMLImageElement): DeerSprite | null {
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
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  return { canvas: c, cx: minX, cy: minY, cw, ch, aspect: cw / ch };
}

type ModelChoice = {
  id: string;
  label: string;
  params: ThermalSimParams;
};

function matrixHeight(m: ThermalMatrix): number {
  return m === 640 ? 512 : m === 384 ? 288 : 192;
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
    priceUah: o.priceUah,
  };
}

/** A contrasting class for the default B panel, so the compare starts useful. */
function contrastPresetId(a: ThermalMatrix): string {
  return a >= 640 ? "preset:256" : "preset:640";
}

/** Normalize for fuzzy search: lower-case, collapse spaces / punctuation. */
function searchNorm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[×х]/gi, "x")
    .replace(/[^a-zа-яёіїєґ0-9.\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(label: string, query: string): boolean {
  const q = searchNorm(query);
  if (!q) return true;
  const hay = searchNorm(label);
  // All tokens must appear (order-independent): "hik 640" → hikmicro 640
  return q.split(" ").every((tok) => hay.includes(tok));
}

/**
 * Searchable model picker for A/B compare — type name/matrix/D instead of
 * scrolling a long &lt;select&gt;.
 */
function ModelSearchSelect({
  label,
  valueId,
  options,
  onChange,
  isRu,
}: {
  label: string;
  valueId: string;
  options: ModelChoice[];
  onChange: (id: string) => void;
  isRu: boolean;
}) {
  const selected = options.find((o) => o.id === valueId) || options[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const list = options.filter((o) => matchesSearch(o.label, query));
    return list.length ? list : options.slice(0, 0); // empty → show empty state
  }, [options, query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep highlight in range when filter changes
  useEffect(() => {
    setHi(0);
  }, [query, open]);

  // Scroll active item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[hi] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[hi];
      if (item) pick(item.id);
    }
  };

  return (
    <div ref={rootRef} className="relative block text-xs text-muted-ui">
      <span className="mb-1 block font-medium">{label}</span>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border bg-[#12141a] px-2.5 py-2 transition",
          open
            ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/40"
            : "border-white/15 hover:border-white/25"
        )}
      >
        <span className="shrink-0 text-faint" aria-hidden>
          ⌕
        </span>
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-faint"
          placeholder={
            open
              ? isRu
                ? "Имя, матрица, D…"
                : "Назва, матриця, D…"
              : selected?.label || (isRu ? "Выберите модель" : "Оберіть модель")
          }
          value={open ? query : selected?.label || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            // select-all next tick so typing replaces
            requestAnimationFrame(() => inputRef.current?.select());
          }}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`model-list-${label}`}
          role="combobox"
        />
        {open && query && (
          <button
            type="button"
            className="shrink-0 text-[11px] text-faint hover:text-primary"
            onClick={() => setQuery("")}
            aria-label={isRu ? "Очистить" : "Очистити"}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="shrink-0 text-faint hover:text-primary"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) {
              setQuery("");
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
          aria-label={open ? "Close" : "Open"}
          tabIndex={-1}
        >
          {open ? "▴" : "▾"}
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={`model-list-${label}`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/15 bg-[#0e1016] py-1 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-faint">
              {isRu ? "Ничего не найдено" : "Нічого не знайдено"}
            </li>
          ) : (
            filtered.map((o, idx) => {
              const active = o.id === valueId;
              const highlighted = idx === hi;
              return (
                <li key={o.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition",
                      highlighted && "bg-white/10",
                      active && "text-[var(--accent)]",
                      !highlighted && !active && "text-primary hover:bg-white/5"
                    )}
                    onMouseEnter={() => setHi(idx)}
                    onClick={() => pick(o.id)}
                  >
                    <span className="min-w-0 flex-1 leading-snug">{o.label}</span>
                    {active && (
                      <span className="shrink-0 text-[10px] text-faint">✓</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-faint">
        {isRu
          ? "Начните вводить название или 640 / 256 / D=…"
          : "Почніть вводити назву або 640 / 256 / D=…"}
      </p>
    </div>
  );
}

/** Small glass HUD in the corner of a panel: 4 scores + Total. */
function ScoreHud({
  scores,
  isRu,
}: {
  scores: ScoreBreakdown;
  isRu: boolean;
}) {
  const L = isRu ? HUD_METRICS.ru : HUD_METRICS.uk;
  // 3 productivity scores only — Value is not shown (gap% + crossover handle “worth it?”)
  const rows = [
    ["performance", scores.performance],
    ["range", scores.range],
    ["image", scores.image],
  ] as const;
  return (
    <div
      className="pointer-events-none absolute right-2 top-2 w-[132px] rounded-lg border border-white/15 px-2.5 py-2 text-white shadow-lg sm:w-[150px]"
      style={{
        background: "rgba(10,12,16,0.35)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="flex flex-col gap-1.5">
        {rows.map(([key, val]) => (
          <div key={key} title={L[key][1]}>
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] uppercase tracking-wide text-white/60">
                {L[key][0]}
              </span>
              <span className="text-[10px] font-semibold tabular-nums">
                {val}
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${val}%`, background: scoreColor(val) }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5"
        title={L.total[1]}
      >
        <span className="text-[9px] uppercase tracking-wide text-white/60">
          {L.total[0]}
        </span>
        <span
          className="text-base font-bold leading-none tabular-nums"
          style={{ color: scoreColor(scores.total) }}
        >
          {scores.total}
          <span className="ml-0.5 text-[9px] font-normal text-white/50">
            /100
          </span>
        </span>
      </div>
    </div>
  );
}

export function ThermalSimulator({
  params,
  locale = "uk",
  compareOptions: compareOptionsProp,
  currentProductId,
  className,
}: Props) {
  const isRu = locale === "ru";

  const [distance, setDistance] = useState(() =>
    defaultSimDistanceM(params.detectionRangeM || 1200)
  );
  const [zoom, setZoom] = useState<number>(1);
  const [weather, setWeather] = useState<Weather>("clear");
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [target, setTarget] = useState<ThermalTarget>("deer");
  const activeTarget = useMemo(() => getThermalTarget(target), [target]);
  const [catalog, setCatalog] = useState<ThermalCompareOption[]>(
    compareOptionsProp || []
  );
  const [selA, setSelA] = useState<string>("current");
  const [selB, setSelB] = useState<string>(() =>
    contrastPresetId(params.matrix)
  );
  const [showMath, setShowMath] = useState(false);
  const [ready, setReady] = useState(false);

  const currentParams: ThermalSimParams = useMemo(
    () => ({ ...params }),
    [params]
  );

  const fog = weather === "fog";

  // Build the shared option list: this product + class presets + catalog.
  const options = useMemo<ModelChoice[]>(() => {
    const list: ModelChoice[] = [
      {
        id: "current",
        label: `${currentParams.label} · ${isRu ? "этот прибор" : "цей прилад"}`,
        params: currentParams,
      },
    ];
    ([256, 384, 640] as ThermalMatrix[]).forEach((m) => {
      const preset = matrixClassPreset(m);
      list.push({
        id: `preset:${m}`,
        label: `${m}×${matrixHeight(m)} · D=${preset.detectionRangeM} · ${
          isRu ? "типовой" : "типовий"
        }`,
        params: {
          ...preset,
          label: `${m}×${matrixHeight(m)} ${isRu ? "(типовой)" : "(типовий)"}`,
        },
      });
    });
    catalog
      .filter((c) => c.id !== currentProductId)
      .forEach((o) => {
        list.push({
          id: o.id,
          label: `${o.name} · ${o.matrix} · D=${o.detectionRangeM}`,
          params: optionToParams(o),
        });
      });
    return list;
  }, [currentParams, catalog, currentProductId, isRu]);

  const findChoice = useCallback(
    (id: string, fallbackIdx: number): ModelChoice =>
      options.find((o) => o.id === id) || options[fallbackIdx] || options[0],
    [options]
  );

  const modelA = findChoice(selA, 0);
  const modelB = findChoice(selB, 1);

  const panels = useMemo(
    () => [
      { key: "a" as PanelKey, choice: modelA },
      { key: "b" as PanelKey, choice: modelB },
    ],
    [modelA, modelB]
  );

  const sliderMax = useMemo(() => {
    return Math.max(
      300,
      modelA.params.detectionRangeM,
      modelB.params.detectionRangeM
    );
  }, [modelA.params.detectionRangeM, modelB.params.detectionRangeM]);

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
  const subjectImg = useRef<HTMLImageElement | null>(null);
  const subjectSprite = useRef<DeerSprite | null>(null);
  const composeRef = useRef<HTMLCanvasElement | null>(null);
  const matrixRef = useRef<HTMLCanvasElement | null>(null);

  // Load forest once + subject sprite for the selected target (deer/boar/fox/human).
  useEffect(() => {
    let cancelled = false;
    let n = 0;
    const subjectSrc = SUBJECT_SRC[target] || activeTarget.subjectSrc;
    const done = () => {
      n += 1;
      if (n >= 2 && !cancelled) {
        subjectSprite.current = subjectImg.current
          ? buildSubjectSprite(subjectImg.current)
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
    load(FOREST_SRC, forestImg);
    load(subjectSrc, subjectImg);
    return () => {
      cancelled = true;
    };
  }, [target, activeTarget.subjectSrc]);

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

      // ---- Layer 1: fixed-FOV forest background ----
      cctx.fillStyle = "#0a0b10";
      cctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      cctx.imageSmoothingEnabled = true;
      const forest = forestImg.current;
      if (forest && forest.complete && forest.naturalWidth > 0) {
        drawCover(cctx, forest, LOGIC_W, LOGIC_H);
      }

      // ---- Layer 2: subject on ground plane (FOV size, shared feet row) ----
      const sprite = subjectSprite.current;
      let focusXFrac = 0.5;
      let focusYFrac = 0.5;
      if (sprite) {
        // Real angular size: (H / d) / FOV — human ≠ face-fill at 50 m
        const heightFrac = subjectHeightFrac(
          activeTarget.visualHeightM,
          distance
        );
        const rect = deerScreenRect(
          distance,
          LOGIC_W,
          LOGIC_H,
          sprite.aspect,
          DIST_MIN_M,
          0,
          heightFrac
        );
        const trans = atmosphericTransmission(
          distance,
          panelParams.detectionRangeM,
          fog
        );
        focusXFrac = rect.cx / LOGIC_W;
        focusYFrac = rect.cy / LOGIC_H;

        // Warm ground contact bloom so the subject is planted, not pasted.
        const feetY = rect.feetY ?? rect.y + rect.h;
        const bloomR = Math.max(4, rect.w * 0.62);
        cctx.save();
        cctx.translate(rect.cx, feetY);
        cctx.scale(1, 0.24);
        const bloom = cctx.createRadialGradient(0, 0, 0, 0, 0, bloomR);
        bloom.addColorStop(0, `rgba(255,238,205,${0.3 * trans})`);
        bloom.addColorStop(1, "rgba(255,238,205,0)");
        cctx.fillStyle = bloom;
        cctx.beginPath();
        cctx.arc(0, 0, bloomR, 0, Math.PI * 2);
        cctx.fill();
        cctx.restore();

        // Atmospheric wash: distant target blends toward background temperature.
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
        target,
        panelParams.matrix,
        panelParams.netdMk,
        panelParams.detectionRangeM,
        distance,
        weather,
        palette,
        panelSeedExtra,
        "v9-multitarget"
      );
      const rand = mulberry32(seed);

      const imageData = cctx.getImageData(0, 0, LOGIC_W, LOGIC_H);
      const d = imageData.data;
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

      // ---- On-canvas camera OSD (top-left; scores live in the glass HUD) ----
      ctx.fillStyle = "rgba(225,29,42,0.95)";
      ctx.font = "600 11px Manrope, system-ui, sans-serif";
      ctx.fillText(
        `${panelParams.matrix}×${matrixHeight(panelParams.matrix)}`,
        12,
        20
      );
      ctx.fillStyle = "rgba(245,246,247,0.8)";
      ctx.fillText(`${distance} m`, 12, 36);
      if (zoom > 1) {
        ctx.fillStyle = "rgba(245,246,247,0.9)";
        ctx.fillText(`×${zoom}`, 12, 52);
      }
    },
    [distance, zoom, weather, palette, target, fog, activeTarget.visualHeightM]
  );

  useEffect(() => {
    if (!ready) return;
    for (const panel of panels) {
      const canvas = canvasMap.current.get(panel.key) || null;
      renderPanel(canvas, panel.choice.params, panel.key);
    }
  }, [ready, panels, renderPanel]);

  const setCanvasRef = (key: PanelKey) => (el: HTMLCanvasElement | null) => {
    if (el) canvasMap.current.set(key, el);
    else canvasMap.current.delete(key);
  };

  const panelStatus = (p: ThermalSimParams) => {
    const status = computeDetectStatus({
      distanceM: distance,
      maxRangeM: p.detectionRangeM,
      fog,
      targetFactor: TARGET_FACTOR[target],
    });
    const px = pxOnTarget(distance, p.detectionRangeM, target, fog);
    return { status, px };
  };

  // ---- Live comparison numbers (shared by the strip and the Math panel) ----
  const perfA = performanceAtDistance(modelA.params, distance, target, fog);
  const perfB = performanceAtDistance(modelB.params, distance, target, fog);
  const gap = gapPct(perfA, perfB);
  const gapRounded = Math.round(gap);
  const leaderChoice = perfA >= perfB ? modelA : modelB;
  const otherChoice = perfA >= perfB ? modelB : modelA;
  const nearlyEqual = gap < 1;

  // Long-range winner = larger passport D (drives the crossover sentence).
  const longLeader =
    modelB.params.detectionRangeM >= modelA.params.detectionRangeM
      ? modelB
      : modelA;
  const sameRange =
    modelA.params.detectionRangeM === modelB.params.detectionRangeM;
  const cross = sameRange
    ? null
    : crossoverM(modelA.params, modelB.params, {
        target,
        fog,
        gapThreshold: 8,
        maxM: sliderMax,
      });

  const targetLabel = (isRu ? TARGET_LABEL_RU : TARGET_LABEL_UK)[target];

  const pxA = pxOnTarget(distance, modelA.params.detectionRangeM, target, fog);
  const pxB = pxOnTarget(distance, modelB.params.detectionRangeM, target, fog);
  const hi = Math.max(perfA, perfB);
  const lo = Math.min(perfA, perfB);

  const headline = nearlyEqual
    ? isRu
      ? `На ${distance} м обе модели показывают цель практически одинаково (${gap.toFixed(
          1
        )}%).`
      : `На ${distance} м обидві моделі показують ціль майже однаково (${gap.toFixed(
          1
        )}%).`
    : isRu
    ? `На ${distance} м «${leaderChoice.params.label}» показывает цель на ${gapRounded}% лучше, чем «${otherChoice.params.label}».`
    : `На ${distance} м «${leaderChoice.params.label}» показує ціль на ${gapRounded}% краще за «${otherChoice.params.label}».`;

  const crossoverText = sameRange
    ? isRu
      ? "У моделей одинаковая паспортная дальность — разрыв определяется чёткостью и ценой."
      : "У моделей однакова паспортна дальність — розрив визначається чіткістю та ціною."
    : cross == null
    ? isRu
      ? "Разрыв не превышает 8% на всей дистанции — модели взаимозаменяемы."
      : "Розрив не перевищує 8% на всій дистанції — моделі взаємозамінні."
    : cross <= DIST_MIN_M
    ? isRu
      ? `Модели расходятся уже с ${DIST_MIN_M} м — «${longLeader.params.label}» впереди почти всегда.`
      : `Моделі розходяться вже з ${DIST_MIN_M} м — «${longLeader.params.label}» попереду майже завжди.`
    : isRu
    ? `До ~${cross} м разница несущественна (<8%) — можно брать дешевле. Дальше преимущество «${longLeader.params.label}» растёт.`
    : `До ~${cross} м різниця несуттєва (<8%) — можна брати дешевше. Далі перевага «${longLeader.params.label}» зростає.`;

  // Fill the difference bar toward the leader's side (A = left, B = right).
  const barLeaderIsB = perfB > perfA;
  const barFill = Math.min(50, (gap / 100) * 50 + (nearlyEqual ? 0 : 6));

  const rowA = {
    label: modelA.params.label,
    matrix: modelA.params.matrix,
    D: modelA.params.detectionRangeM,
  };
  const rowB = {
    label: modelB.params.label,
    matrix: modelB.params.matrix,
    D: modelB.params.detectionRangeM,
  };

  return (
    <section
      className={cn(
        "thermal-sim rounded-[var(--radius-card)] border border-white/[0.1] p-5 sm:p-6",
        className
      )}
      style={{ background: "var(--surface)" }}
      aria-label={isRu ? "Симулятор тепловизора" : "Симулятор тепловізора"}
    >
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold tracking-tight text-primary sm:text-xl">
          {isRu
            ? "Сравнение двух приборов по дистанции"
            : "Порівняння двох приладів за дистанцією"}
        </h2>
        <p className="mt-1 text-sm text-secondary">
          {isRu
            ? "Один ползунок дистанции — обе модели считаются по критерию Джонсона. Баллы в углу каждого экрана."
            : "Один повзунок дистанції — обидві моделі рахуються за критерієм Джонсона. Бали в кутку кожного екрана."}
        </p>
      </div>

      {/* Model pickers — searchable (type name / matrix / D) */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <ModelSearchSelect
          label={isRu ? "Модель A (слева)" : "Модель A (зліва)"}
          valueId={selA}
          options={options}
          onChange={setSelA}
          isRu={isRu}
        />
        <ModelSearchSelect
          label={isRu ? "Модель B (справа)" : "Модель B (справа)"}
          valueId={selB}
          options={options}
          onChange={setSelB}
          isRu={isRu}
        />
      </div>

      {/* Panels: A left, B right; stack on mobile */}
      <div className="grid gap-4 md:grid-cols-2">
        {panels.map((panel) => {
          const p = panel.choice.params;
          const { status, px } = panelStatus(p);
          const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
          const scores = scoreModelAtDistance(p, distance, target, fog);
          const isLeader =
            !nearlyEqual && leaderChoice.id === panel.choice.id;
          return (
            <div key={panel.key}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-ui">
                  <span className="mr-1 text-faint">
                    {panel.key === "a" ? "A" : "B"}
                  </span>
                  {p.label}
                  <span className="ml-2 normal-case text-faint">
                    {p.matrix} · D={p.detectionRangeM} · NETD {p.netdMk}
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
                className="relative overflow-hidden rounded-xl border-2 bg-black"
                style={{
                  borderColor: isLeader
                    ? "rgba(52,211,153,0.55)"
                    : "rgba(63,63,70,0.8)",
                  boxShadow: isLeader
                    ? "0 0 0 3px rgba(52,211,153,0.18), 0 12px 40px rgba(0,0,0,0.5)"
                    : "0 0 0 3px #12141a, 0 10px 30px rgba(0,0,0,0.45)",
                }}
              >
                <canvas
                  ref={setCanvasRef(panel.key)}
                  width={LOGIC_W}
                  height={LOGIC_H}
                  className="block h-auto w-full"
                  style={{ aspectRatio: `${LOGIC_W} / ${LOGIC_H}` }}
                  role="img"
                  aria-label={`${p.label}: ${statusLabel}, ${distance} m, total ${scores.total}/100`}
                />
                <ScoreHud scores={scores} isRu={isRu} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live percentage comparison + crossover insight */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-center text-sm font-semibold text-primary sm:text-base">
          {headline}
        </p>
        {/* Difference indicator: A ← center → B */}
        <div className="mx-auto mt-3 flex max-w-md items-center gap-2">
          <span className="w-6 text-right text-[11px] font-semibold text-faint">
            A
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
            <div
              className="absolute top-0 h-full rounded-full"
              style={{
                background: nearlyEqual ? "#a1a1aa" : "#34d399",
                left: barLeaderIsB ? "50%" : `${50 - barFill}%`,
                width: `${barFill}%`,
              }}
            />
          </div>
          <span className="w-6 text-[11px] font-semibold text-faint">B</span>
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-secondary">
          {crossoverText}
        </p>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setShowMath((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-secondary transition hover:border-[var(--accent)] hover:text-primary"
            aria-expanded={showMath}
          >
            <span aria-hidden>∑</span>
            {isRu
              ? showMath
                ? "Скрыть математику"
                : "Показать математику"
              : showMath
              ? "Сховати математику"
              : "Показати математику"}
          </button>
        </div>

        {showMath && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3">
            <table className="w-full min-w-[420px] text-xs tabular-nums">
              <thead>
                <tr className="text-left text-faint">
                  <th className="py-1 pr-3 font-medium">
                    {isRu ? "Параметр" : "Параметр"}
                  </th>
                  <th className="py-1 pr-3 font-medium text-primary">
                    A · {rowA.label}
                  </th>
                  <th className="py-1 font-medium text-primary">
                    B · {rowB.label}
                  </th>
                </tr>
              </thead>
              <tbody className="text-secondary">
                <tr>
                  <td className="py-1 pr-3 text-muted-ui">
                    {isRu ? "Матрица" : "Матриця"}
                  </td>
                  <td className="py-1 pr-3">
                    {rowA.matrix}×{matrixHeight(rowA.matrix)}
                  </td>
                  <td className="py-1">
                    {rowB.matrix}×{matrixHeight(rowB.matrix)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-3 text-muted-ui">
                    {isRu ? "Дальность D, м" : "Дальність D, м"}
                  </td>
                  <td className="py-1 pr-3">{rowA.D}</td>
                  <td className="py-1">{rowB.D}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3 text-muted-ui">
                    {isRu ? "Цель" : "Ціль"}
                  </td>
                  <td className="py-1 pr-3" colSpan={2}>
                    {targetLabel} · ×{TARGET_FACTOR[target].toFixed(2)}
                    {fog ? (isRu ? " · туман ×0.6" : " · туман ×0.6") : ""} ·{" "}
                    {distance} м
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-3 text-muted-ui">
                    px = 2·D/dist · {isRu ? "цель" : "ціль"}
                  </td>
                  <td className="py-1 pr-3">{pxA.toFixed(2)}</td>
                  <td className="py-1">{pxB.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3 text-muted-ui">
                    resolveScore (px)
                  </td>
                  <td className="py-1 pr-3">{perfA.toFixed(1)}</td>
                  <td className="py-1">{perfB.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-faint">
              gap% = (max − min) / max × 100 = ({hi.toFixed(1)} −{" "}
              {lo.toFixed(1)}) / {hi.toFixed(1)} × 100 ={" "}
              <span className="font-semibold text-secondary">
                {gap.toFixed(1)}%
              </span>
              {cross != null &&
                !sameRange &&
                (isRu
                  ? ` · crossover (8%) ≈ ${cross} м`
                  : ` · crossover (8%) ≈ ${cross} м`)}
            </p>
          </div>
        )}
      </div>

      {/* Shared controls */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium text-muted-ui">
              <span>
                {isRu
                  ? "Дистанция до цели (общая для обеих панелей)"
                  : "Дистанція до цілі (спільна для обох панелей)"}
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
                ? `Размер = (высота тела / дистанция) / FOV ≈11°: на ${DIST_MIN_M} м все стоят в одной точке (ноги на земле), человек ~${Math.round(
                    subjectHeightFrac(1.8, DIST_MIN_M) * 100
                  )}% кадра, олень ~${Math.round(
                    subjectHeightFrac(1.3, DIST_MIN_M) * 100
                  )}%, лиса меньше. К ${sliderMax} м уходят к горизонту.`
                : `Розмір = (висота тіла / дистанція) / FOV ≈11°: на ${DIST_MIN_M} м усі в одній точці (ноги на землі), людина ~${Math.round(
                    subjectHeightFrac(1.8, DIST_MIN_M) * 100
                  )}% кадру, олень ~${Math.round(
                    subjectHeightFrac(1.3, DIST_MIN_M) * 100
                  )}%, лисиця менша. До ${sliderMax} м ідуть до горизонту.`}
            </span>
          </label>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu
              ? "Цель (картинка + расчёт px)"
              : "Ціль (картинка + розрахунок px)"}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THERMAL_TARGETS.map((tg) => {
              const def = TARGET_DEFS.find((d) => d.id === tg);
              return (
                <button
                  key={tg}
                  type="button"
                  onClick={() => setTarget(tg)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition",
                    target === tg
                      ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                      : "border-white/10 text-secondary hover:border-white/20"
                  )}
                >
                  {(isRu ? TARGET_LABEL_RU : TARGET_LABEL_UK)[tg]}
                  {def && (
                    <span className="mt-0.5 block text-[10px] font-normal text-faint">
                      {def.visualHeightM} м
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-faint">
            {isRu
              ? "Лиса меньше и «съедается» дальностью первой; человек выше оленя. Баллы и px пересчитываются для обеих моделей."
              : "Лисиця менша й «з'їдається» дальністю першою; людина вища за оленя. Бали й px перераховуються для обох моделей."}
          </p>
        </fieldset>

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

        <fieldset className="sm:col-span-2 lg:col-span-3">
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Палитра" : "Палітра"}
          </legend>
          <div className="flex max-w-xs gap-2">
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
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        {isRu
          ? "Критерий Джонсона: px = 2×(D/dist), масштабируется размером цели — выявление ≥2, распознавание ≥8, идентификация ≥13. resolveScore насыщается выше идентификации, поэтому вблизи разрыв мал, а вдали велик. Кадр 480×270, seeded noise — одинаково на всех устройствах."
          : "Критерій Джонсона: px = 2×(D/dist), масштабується розміром цілі — виявлення ≥2, розпізнавання ≥8, ідентифікація ≥13. resolveScore насичується вище ідентифікації, тому зблизька розрив малий, а вдалині великий. Кадр 480×270, seeded noise — однаково на всіх пристроях."}
      </p>
      <p className="mt-2 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-faint/90">
        {isRu
          ? "D — паспортная дальность выявления (производители часто указывают для человека); сцена демонстрирует оленя, переключатель цели меняет только расчёт px. Симуляция приблизительная, не заменяет полевые испытания."
          : "D — паспортна дальність виявлення (виробники часто вказують для людини); сцена демонструє оленя, перемикач цілі змінює лише розрахунок px. Симуляція приблизна, не замінює польові випробування."}
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

export { SUBJECT_SRC, FOREST_SRC };
