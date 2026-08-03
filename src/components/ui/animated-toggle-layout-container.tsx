"use client";

/**
 * Animated product grid density toggle (list / 2 / 3 / 4 / dense).
 * Adapted from motion LayoutGroup pattern for Pro-Optics dark theme.
 * Mobile-first: always wraps in CSS grid — no horizontal scroll.
 */

import * as React from "react";
import {
  LayoutGroup,
  motion,
  type HTMLMotionProps,
  useReducedMotion,
} from "motion/react";
import { LayoutGrid, LayoutList, Columns2, Columns3, Grid2x2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type LayoutMode = "list" | "2col" | "3col" | "4col" | "dense";

type LayoutConfig = {
  mode: LayoutMode;
  /** Tailwind grid/flex classes — mobile-first, wrap always */
  className: string;
  labelUk: string;
  labelRu: string;
  Icon: React.ComponentType<{ className?: string }>;
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
    className: "grid grid-cols-2 gap-3 sm:gap-4",
    labelUk: "2",
    labelRu: "2",
    Icon: Columns2,
  },
  {
    mode: "3col",
    className: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
    labelUk: "3",
    labelRu: "3",
    Icon: Columns3,
  },
  {
    mode: "4col",
    className:
      "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4",
    labelUk: "4",
    labelRu: "4",
    Icon: LayoutGrid,
  },
  {
    mode: "dense",
    className:
      "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    labelUk: "Більше",
    labelRu: "Больше",
    Icon: Grid2x2,
  },
];

const STORAGE_KEY = "pro-optics-product-layout";

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

type ContainerToggleProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Default layout mode */
  defaultMode?: LayoutMode;
  /** Locale for labels */
  locale?: string;
  /** Persist choice in localStorage */
  persist?: boolean;
  /** Which modes to show (default: all) */
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
      configs.find((c) => c.mode === mode) || configs[configs.length - 1];

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
        <LayoutGroup id="product-layout-toggle">
          <div
            className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 sm:mb-5"
            role="group"
            aria-label={isRu ? "Вид сетки товаров" : "Вигляд сітки товарів"}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint sm:text-xs">
              {isRu ? "Вид" : "Вигляд"}
            </p>
            <div className="inline-flex rounded-lg border border-white/15 bg-black/30 p-0.5">
              {configs.map((config) => {
                const selected = currentConfig.mode === config.mode;
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
                      "relative h-8 min-w-[2rem] gap-1 rounded-md px-2 text-[11px] font-semibold hover:bg-transparent sm:h-9 sm:px-2.5 sm:text-xs",
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
                            : { type: "spring", stiffness: 380, damping: 32 }
                        }
                      />
                    )}
                    <span className="relative z-[1] inline-flex items-center gap-1">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden tabular-nums sm:inline">
                        {label}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <motion.div
            layout={!reduceMotion}
            variants={ANIMATION_VARIANTS.container}
            initial={false}
            animate={hydrated ? currentConfig.mode : defaultMode}
            className={cn(
              currentConfig.className,
              // Prevent horizontal overflow on small screens
              "w-full min-w-0"
            )}
          >
            {children}
          </motion.div>
        </LayoutGroup>
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
      className={cn("min-w-0 w-full", className)}
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
