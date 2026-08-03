"use client";

/**
 * Product grid density toggle.
 * Modes: 4 | 6 only (no 8 / «Больше»).
 * Mobile: 4→2, 6→3 max.
 */

import * as React from "react";
import {
  LayoutGroup,
  motion,
  type HTMLMotionProps,
  useReducedMotion,
} from "motion/react";
import { LayoutGrid, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** 4 · 6 */
export type LayoutMode = "4col" | "6col";

type LayoutConfig = {
  mode: LayoutMode;
  className: string;
  labelUk: string;
  labelRu: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const LAYOUT_CONFIGS: LayoutConfig[] = [
  {
    mode: "4col",
    // phone 2 → sm 3 → lg 4
    className:
      "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4",
    labelUk: "4",
    labelRu: "4",
    Icon: LayoutGrid,
  },
  {
    mode: "6col",
    // phone max 3 → md 4 → lg 6
    className:
      "grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-6 lg:gap-3",
    labelUk: "6",
    labelRu: "6",
    Icon: Grid3x3,
  },
];

const STORAGE_KEY = "pro-optics-product-layout-v3";

function readStoredMode(fallback: LayoutMode): LayoutMode {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(STORAGE_KEY) as LayoutMode | null;
    if (v && LAYOUT_CONFIGS.some((c) => c.mode === v)) return v;
    // migrate: dense/8 → 6
    const old =
      localStorage.getItem("pro-optics-product-layout-v2") ||
      localStorage.getItem("pro-optics-product-layout");
    if (old === "6col" || old === "dense") return "6col";
    if (old === "4col" || old === "2col" || old === "3col") return "4col";
  } catch {
    /* ignore */
  }
  return fallback;
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: {},
    "4col": { transition: { staggerChildren: 0.04 } },
    "6col": { transition: { staggerChildren: 0.03 } },
  },
  card: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
};

export const LayoutModeContext = React.createContext<LayoutMode>("4col");

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
      defaultMode = "4col",
      locale = "uk",
      persist = true,
      modes,
      ...props
    },
    ref
  ) => {
    const isRu = locale === "ru";
    const reduceMotion = useReducedMotion();

    const configs = React.useMemo(() => {
      if (!modes?.length) return LAYOUT_CONFIGS;
      return LAYOUT_CONFIGS.filter((c) => modes.includes(c.mode));
    }, [modes]);

    const [mode, setMode] = React.useState<LayoutMode>(defaultMode);
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
      setMode(persist ? readStoredMode(defaultMode) : defaultMode);
      setHydrated(true);
    }, [defaultMode, persist]);

    const currentConfig =
      configs.find((c) => c.mode === mode) || configs[0];

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

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <LayoutModeContext.Provider value={mode}>
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
                {configs.map((config) => {
                  const selected = mode === config.mode;
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
                        <span className="tabular-nums">{label}</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <motion.div
              key={mode}
              layout={!reduceMotion}
              variants={ANIMATION_VARIANTS.container}
              initial={false}
              animate={hydrated ? mode : "4col"}
              data-layout={mode}
              className={cn(
                currentConfig.className,
                "w-full min-w-0",
                mode === "6col" && "product-grid--tight"
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
