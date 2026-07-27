"use client";

import { useState } from "react";
import type { PriceCompareSummary } from "@/lib/price-compare/types";
import { MIN_SAVINGS_UAH } from "@/lib/price-compare/types";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

/** Compact number: 4100 → "4 100 ₴" */
function shortUah(n: number, locale: string): string {
  const formatted = new Intl.NumberFormat(
    locale === "ru" ? "ru-UA" : "uk-UA",
    { maximumFractionDigits: 0 }
  ).format(n);
  return `${formatted} ₴`;
}

/** Delta without currency: −4 100 / +1 200 */
function shortDelta(n: number, locale: string): string {
  const abs = new Intl.NumberFormat(
    locale === "ru" ? "ru-UA" : "uk-UA",
    { maximumFractionDigits: 0 }
  ).format(Math.abs(n));
  if (n > 0) return `−${abs}`;
  if (n < 0) return `+${abs}`;
  return "≈";
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
            <span className="text-emerald-200/50">
              {" "}
              · {isRu ? "устар." : "застар."}
            </span>
          ) : null}
        </span>
      </button>

      {open && (
        <div
          role="tooltip"
          className={cn(
            /* Above badge — fits above price row without running off card bottom */
            "absolute bottom-full left-0 z-50 mb-1.5",
            "w-[min(100%,15rem)]",
            "rounded-lg px-2.5 py-2 shadow-xl"
          )}
          style={{
            /* Fully opaque — no glass / alpha */
            background: "#12141a",
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.65)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <p className="mb-1.5 font-display text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-ui">
            {isRu ? "Сравнение цен" : "Порівняння цін"}
          </p>

          <table className="w-full table-fixed border-collapse font-sans text-[0.7rem] leading-tight">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[35%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/[0.12] text-[0.58rem] font-medium uppercase tracking-wide text-faint">
                <th className="pb-1 pr-1.5 text-left font-medium">
                  {isRu ? "Магазин" : "Магазин"}
                </th>
                <th className="pb-1 px-0.5 text-right font-medium">
                  {isRu ? "Цена" : "Ціна"}
                </th>
                <th className="pb-1 pl-0.5 text-right font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.08] text-primary">
                <td className="truncate py-1.5 pr-1.5 text-left font-semibold align-middle">
                  Pro-Optics
                </td>
                <td className="py-1.5 px-0.5 text-right tabular-nums font-semibold tracking-tight align-middle whitespace-nowrap text-emerald-400">
                  {shortUah(compare.ourPrice, locale)}
                </td>
                <td className="py-1.5 pl-0.5 text-right tabular-nums text-faint align-middle">
                  —
                </td>
              </tr>
              {compare.lines.map((l) => (
                <tr
                  key={l.competitorId}
                  className="border-b border-white/[0.08] last:border-0 text-secondary"
                >
                  <td
                    className="truncate py-1.5 pr-1.5 text-left align-middle"
                    title={l.competitorName}
                  >
                    {l.competitorName}
                  </td>
                  <td className="py-1.5 px-0.5 text-right tabular-nums tracking-tight align-middle whitespace-nowrap text-emerald-400/90">
                    {shortUah(l.competitorPrice, locale)}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 pl-0.5 text-right tabular-nums text-[0.65rem] font-semibold tracking-tight align-middle whitespace-nowrap",
                      l.savingUah > 0
                        ? "text-emerald-400"
                        : l.savingUah < 0
                          ? "text-amber-400"
                          : "text-faint"
                    )}
                  >
                    {shortDelta(l.savingUah, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {compare.checkedAt && (
            <p className="mt-1.5 border-t border-white/[0.08] pt-1.5 font-sans text-[0.58rem] leading-snug text-faint">
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
