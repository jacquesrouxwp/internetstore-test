"use client";

import { useState } from "react";
import type { PriceCompareSummary } from "@/lib/price-compare/types";
import { MIN_SAVINGS_UAH } from "@/lib/price-compare/types";
import { formatPrice, cn } from "@/lib/utils";
import { useLocale } from "next-intl";

/** Compact number for badge: 4100 → "4 100 ₴" */
function shortUah(n: number, locale: string): string {
  const formatted = new Intl.NumberFormat(
    locale === "ru" ? "ru-UA" : "uk-UA",
    { maximumFractionDigits: 0 }
  ).format(n);
  return `${formatted} ₴`;
}

export function PriceCompareBadge({
  compare,
  className,
}: {
  compare?: PriceCompareSummary | null;
  className?: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  if (!compare || compare.bestSavingUah < MIN_SAVINGS_UAH) return null;

  const isRu = locale === "ru";
  const amount = shortUah(compare.bestSavingUah, locale);
  const name = compare.bestCompetitorName;

  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      <button
        type="button"
        className={cn(
          "flex w-full min-w-0 flex-col gap-0.5 overflow-hidden rounded-xl",
          "px-2.5 py-2 text-left transition",
          "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        )}
        style={{
          background: "rgba(22, 163, 74, 0.16)",
          border: "1px solid rgba(52, 211, 153, 0.32)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Line 1: amount — fits one line */}
        <span
          className={cn(
            "flex min-w-0 items-baseline gap-1 font-display",
            "text-[0.8125rem] font-semibold leading-snug tracking-tight",
            "text-emerald-300 sm:text-[0.875rem]"
          )}
        >
          <span className="shrink-0 opacity-90" aria-hidden>
            ↓
          </span>
          <span className="min-w-0 truncate tabular-nums">
            {amount}
            <span className="ml-1 font-medium tracking-normal text-emerald-300/90">
              {isRu ? "дешевле" : "дешевше"}
            </span>
          </span>
        </span>
        {/* Line 2: vs name — truncated, no overflow */}
        <span
          className={cn(
            "block min-w-0 truncate pl-4",
            "font-sans text-[0.6875rem] font-medium leading-snug",
            "tracking-wide text-emerald-200/75 sm:text-[0.75rem]"
          )}
          title={isRu ? `чем ${name}` : `ніж ${name}`}
        >
          {isRu ? "чем" : "ніж"}{" "}
          <span className="text-emerald-100/90">{name}</span>
          {compare.isStale ? (
            <span className="text-emerald-200/50"> · {isRu ? "устар." : "застар."}</span>
          ) : null}
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute bottom-full left-0 z-30 mb-1.5",
            "w-[min(calc(100vw-2rem),17.5rem)] max-w-[calc(100%+2rem)]",
            "overflow-hidden rounded-xl p-3 shadow-lift"
          )}
          style={{
            background: "rgba(18, 20, 26, 0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <p className="mb-2.5 font-display text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-ui">
            {isRu ? "Сравнение цен" : "Порівняння цін"}
          </p>
          <ul className="space-y-2 font-sans text-[0.8125rem] leading-snug">
            <li className="flex items-center justify-between gap-3 text-primary">
              <span className="min-w-0 truncate font-medium">Pro-Optics</span>
              <span className="shrink-0 tabular-nums font-semibold">
                {formatPrice(compare.ourPrice, locale)}
              </span>
            </li>
            {compare.lines.map((l) => (
              <li
                key={l.competitorId}
                className="flex items-center justify-between gap-3 text-secondary"
              >
                <span className="min-w-0 truncate">{l.competitorName}</span>
                <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                  <span>{formatPrice(l.competitorPrice, locale)}</span>
                  {l.savingUah > 0 ? (
                    <span className="text-[0.75rem] font-semibold text-emerald-400">
                      −{shortUah(l.savingUah, locale)}
                    </span>
                  ) : l.savingUah < 0 ? (
                    <span className="text-[0.75rem] font-semibold text-amber-400">
                      +{shortUah(-l.savingUah, locale)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {compare.checkedAt && (
            <p className="mt-2.5 border-t border-white/[0.06] pt-2 font-sans text-[0.65rem] leading-relaxed text-faint">
              {isRu ? "Данные на" : "Дані на"}{" "}
              {new Date(compare.checkedAt).toLocaleDateString(
                isRu ? "ru-UA" : "uk-UA"
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
