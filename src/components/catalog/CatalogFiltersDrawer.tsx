"use client";

/**
 * Mobile: products first; filters slide in from the left.
 * Edge tab «Параметри» (vertical) opens the panel.
 * Desktop: normal sidebar column (no drawer chrome).
 */

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import type { Brand } from "@/types";

type Props = {
  brands: Brand[];
  detectionRangeBounds?: { min: number; max: number } | null;
  /** Main catalog column (toolbar + products) */
  children: ReactNode;
};

function countActiveFilters(sp: URLSearchParams): number {
  let n = 0;
  n += sp.getAll("brand").length;
  n += sp.getAll("res").length;
  if (sp.get("type") && sp.get("type") !== "all") n += 1;
  if (sp.get("min")) n += 1;
  if (sp.get("max")) n += 1;
  if (sp.get("rmin")) n += 1;
  if (sp.get("rmax")) n += 1;
  return n;
}

export function CatalogFiltersDrawer({
  brands,
  detectionRangeBounds,
  children,
}: Props) {
  const t = useTranslations("catalog");
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(
    new URLSearchParams(searchParams.toString())
  );

  // Lock body scroll when drawer open (mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
      {/* —— Desktop sidebar —— */}
      <div className="hidden lg:block">
        <CatalogFilters
          brands={brands}
          detectionRangeBounds={detectionRangeBounds}
        />
      </div>

      {/* —— Products column (first on mobile in document flow) —— */}
      <div className="min-w-0 pl-1 lg:pl-0">{children}</div>

      {/* —— Mobile edge tab (vertical «Параметри») —— */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "catalog-filter-tab lg:hidden",
          "fixed left-0 top-[42%] z-40 flex items-center gap-1.5",
          "rounded-r-xl border border-l-0 border-white/15",
          "bg-[rgba(18,20,26,0.92)] px-1.5 py-3 shadow-xl backdrop-blur-md",
          "text-[10px] font-bold uppercase tracking-[0.14em] text-primary",
          "transition active:scale-[0.98]",
          "touch-manipulation"
        )}
        aria-expanded={open}
        aria-controls="catalog-filters-drawer"
      >
        <span
          className="inline-flex items-center gap-1"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          {t("filters")}
          {activeCount > 0 && (
            <span className="mt-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
      </button>

      {/* —— Mobile drawer —— */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-label={t("closeFilters")}
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <aside
          id="catalog-filters-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={t("filters")}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(88vw,20rem)] flex-col",
            "border-r border-white/10 bg-[var(--surface-solid,#12141a)] shadow-2xl",
            "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                {t("filters")}
              </h2>
              {activeCount > 0 && (
                <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                  {activeCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-secondary transition hover:bg-white/10 hover:text-primary"
              aria-label={t("closeFilters")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <CatalogFilters
              brands={brands}
              detectionRangeBounds={detectionRangeBounds}
            />
          </div>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              className="btn-hero btn-hero-primary w-full !min-h-[2.5rem] !text-sm"
              onClick={() => setOpen(false)}
            >
              {t("showResults")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
