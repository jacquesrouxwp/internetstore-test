"use client";

/**
 * Product grid density toggle.
 * Mobile: only 2 | 3 (real column change — max 3 cards).
 * Desktop (md+): 2 | 3 | 4 | Больше (up to 6).
 */

import * as React from "react";
import {
  LayoutGroup,
  motion,
  type HTMLMotionProps,
  useReducedMotion,
} from "motion/react";
import {
  LayoutGrid,
  LayoutList,
  Columns2,
  Columns3,
  Grid2x2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type LayoutMode = "list" | "2col" | "3col" | "4col" | "dense";

type LayoutConfig = {
  mode: LayoutMode;
  /** Real grid classes — mobile values MUST differ or toggle looks broken */
  className: string;
  labelUk: string;
  labelRu: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Hide this button below md (4 / dense only on desktop) */
  desktopOnly?: boolean;
};

const LAYOUT_CONFIGS: LayoutConfig[] = [
  {
    mode: "list",
    className: "flex flex-col gap-3",
    labelUk: "Список",
    labelRu: "Список",
    Icon: LayoutList,
  },
  {
    mode: "2col",
    // Mobile: 2 large cards
    className: "grid grid-cols-2 gap-3 sm:gap-4",
    labelUk: "2",
    labelRu: "2",
    Icon: Columns2,
  },
  {
    mode: "3col",
    // Mobile: TRUE 3 columns (was wrongly grid-cols-2 before)
    className: "grid grid-cols-3 gap-2 sm:gap-3 md:gap-4",
    labelUk: "3",
    labelRu: "3",
    Icon: Columns3,
  },
  {
    mode: "4col",
    // Mobile max 3; 4 only from lg
    className:
      "grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4",
    labelUk: "4",
    labelRu: "4",
    Icon: LayoutGrid,
    desktopOnly: true,
  },
  {
    mode: "dense",
    // Mobile max 3; denser on larger screens
    className:
      "grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    labelUk: "Більше",
    labelRu: "Больше",
    Icon: Grid2x2,
    desktopOnly: true,
  },
];

const STORAGE_KEY = "pro-optics-product-layout";
/** Modes that need a desktop viewport; remapped to 3col on phone */
const DESKTOP_ONLY_MODES: LayoutMode[] = ["4col", "dense"];

function readStoredMode(fallback: LayoutMode): LayoutMode {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(STORAGE_KEY) as LayoutMode | null;
    if (v && LAYOUT_CONFIGS.some((c) => c.mode === v)) return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

function useIsMdUp() {
  const [mdUp, setMdUp] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMdUp(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return mdUp;
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: {},
    list: { transition: { staggerChildren: 0.03 } },
    "2col": { transition: { staggerChildren: 0.04 } },
    "3col": { transition: { staggerChildren: 0.04 } },
    "4col": { transition: { staggerChildren: 0.05 } },
    dense: { transition: { staggerChildren: 0.03 } },
  },
  card: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
};

/** Context so ProductCard can tighten padding in 3-col mobile */
export const LayoutModeContext = React.createContext<LayoutMode>("2col");

type ContainerToggleProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultMode?: LayoutMode;
  locale?: string;
  persist?: boolean;
  modes?: LayoutMode[];
};

export const ContainerToggle = React.forwardRef<
  HTMLDivElement,
  ContainerToggleProps
>(
  (
    {
      children,
      className,
      defaultMode = "2col",
      locale = "uk",
      persist = true,
      modes,
      ...props
    },
    ref
  ) => {
    const isRu = locale === "ru";
    const reduceMotion = useReducedMotion();
    const mdUp = useIsMdUp();

    const configs = React.useMemo(() => {
      const base = !modes?.length
        ? LAYOUT_CONFIGS.filter((c) => c.mode !== "list")
        : LAYOUT_CONFIGS.filter((c) => modes.includes(c.mode));
      return base;
    }, [modes]);

    const [mode, setMode] = React.useState<LayoutMode>(defaultMode);
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
      const stored = persist ? readStoredMode(defaultMode) : defaultMode;
      setMode(stored);
      setHydrated(true);
    }, [defaultMode, persist]);

    // On phone: if user had 4/dense saved, fall back to 3 so UI matches reality
    const effectiveMode: LayoutMode =
      !mdUp && DESKTOP_ONLY_MODES.includes(mode) ? "3col" : mode;

    const currentConfig =
      configs.find((c) => c.mode === effectiveMode) ||
      configs.find((c) => c.mode === "2col") ||
      configs[0];

    const select = (m: LayoutMode) => {
      setMode(m);
      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, m);
        } catch {
          /* ignore */
        }
      }
    };

    // Visible buttons: hide desktop-only on phone
    const visibleConfigs = configs.filter(
      (c) => !c.desktopOnly || mdUp
    );

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <LayoutModeContext.Provider value={effectiveMode}>
          <LayoutGroup id="product-layout-toggle">
            <div
              className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 sm:mb-5"
              role="group"
              aria-label={isRu ? "Вид сетки товаров" : "Вигляд сітки товарів"}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-faint sm:text-xs">
                {isRu ? "Вид" : "Вигляд"}
              </p>
              <div className="inline-flex max-w-full flex-wrap justify-end rounded-lg border border-white/15 bg-black/30 p-0.5">
                {visibleConfigs.map((config) => {
                  const selected = effectiveMode === config.mode;
                  const label = isRu ? config.labelRu : config.labelUk;
                  const Icon = config.Icon;
                  return (
                    <Button
                      key={config.mode}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => select(config.mode)}
                      aria-pressed={selected}
                      aria-label={label}
                      title={label}
                      className={cn(
                        "relative h-8 gap-1 rounded-md px-2.5 text-xs font-semibold hover:bg-transparent sm:h-9 sm:px-3",
                        selected
                          ? "text-white hover:text-white"
                          : "text-secondary hover:text-primary"
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="layout-toggle-pill"
                          className="absolute inset-0 rounded-md bg-[var(--accent)] shadow-md"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  type: "spring",
                                  stiffness: 380,
                                  damping: 32,
                                }
                          }
                        />
                      )}
                      <span className="relative z-[1] inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        {/* Always show label on phone (2 / 3 / Больше) */}
                        <span className="tabular-nums">{label}</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <motion.div
              key={effectiveMode}
              layout={!reduceMotion}
              variants={ANIMATION_VARIANTS.container}
              initial={false}
              animate={hydrated ? effectiveMode : "2col"}
              data-layout={effectiveMode}
              className={cn(
                currentConfig.className,
                "w-full min-w-0",
                // denser cards when 3-up on narrow screens
                effectiveMode === "3col" && "product-grid--tight",
                (effectiveMode === "4col" || effectiveMode === "dense") &&
                  "product-grid--tight"
              )}
            >
              {children}
            </motion.div>
          </LayoutGroup>
        </LayoutModeContext.Provider>
      </div>
    );
  }
);
ContainerToggle.displayName = "ContainerToggle";

export const CellToggle = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      layout={!reduceMotion}
      variants={ANIMATION_VARIANTS.card}
      initial={false}
      animate="visible"
      className={cn("min-w-0 w-full max-w-full", className)}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 220, damping: 28 }
      }
      ref={ref}
      {...props}
    >
      {children}
    </motion.div>
  );
});
CellToggle.displayName = "CellToggle";

export { LAYOUT_CONFIGS };
