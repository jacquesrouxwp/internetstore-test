"use client";

import { useState } from "react";
import type { PriceCompareSummary } from "@/lib/price-compare/types";
import { MIN_SAVINGS_UAH } from "@/lib/price-compare/types";
import { formatPrice, cn } from "@/lib/utils";
import { useLocale } from "next-intl";

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

  const label =
    locale === "ru"
      ? `↓ ${formatPrice(compare.bestSavingUah, locale)} дешевле`
      : `↓ ${formatPrice(compare.bestSavingUah, locale)} дешевше`;

  const vs =
    locale === "ru"
      ? `чем ${compare.bestCompetitorName}`
      : `ніж ${compare.bestCompetitorName}`;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className="w-full rounded-lg px-2 py-1.5 text-left transition hover:brightness-110"
        style={{
          background: "rgba(22, 163, 74, 0.14)",
          border: "1px solid rgba(22, 163, 74, 0.28)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <span className="block text-[11px] font-bold leading-tight text-emerald-300 sm:text-xs">
          {label}
        </span>
        <span className="block text-[10px] leading-tight text-emerald-200/80">
          {vs}
          {compare.isStale ? " · ⚠" : ""}
        </span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-30 mb-1 w-[min(100vw-2rem,260px)] rounded-xl p-3 shadow-lift"
          style={{
            background: "rgba(22, 24, 29, 0.96)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-ui">
            {locale === "ru" ? "Сравнение цен" : "Порівняння цін"}
          </p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex justify-between gap-2 text-primary">
              <span>Pro-Optics</span>
              <span className="font-semibold tabular-nums">
                {formatPrice(compare.ourPrice, locale)}
              </span>
            </li>
            {compare.lines.map((l) => (
              <li
                key={l.competitorId}
                className="flex justify-between gap-2 text-secondary"
              >
                <span className="truncate">{l.competitorName}</span>
                <span className="shrink-0 tabular-nums">
                  {formatPrice(l.competitorPrice, locale)}
                  {l.savingUah > 0 ? (
                    <span className="ml-1 text-emerald-400">
                      −{formatPrice(l.savingUah, locale)}
                    </span>
                  ) : l.savingUah < 0 ? (
                    <span className="ml-1 text-amber-400">
                      +{formatPrice(-l.savingUah, locale)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {compare.checkedAt && (
            <p className="mt-2 text-[10px] text-faint">
              {locale === "ru" ? "Данные на" : "Дані на"}{" "}
              {new Date(compare.checkedAt).toLocaleDateString(
                locale === "ru" ? "ru-UA" : "uk-UA"
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
