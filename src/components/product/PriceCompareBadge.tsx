"use client";

import { useState } from "react";
import type { PriceCompareSummary } from "@/lib/price-compare/types";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

/** Compact number: 4100 → "4 100 ₴" */
function shortUah(n: number, locale: string): string {
  const formatted = new Intl.NumberFormat(
    locale === "ru" ? "ru-UA" : "uk-UA",
    { maximumFractionDigits: 0 }
  ).format(Math.abs(n));
  return `${formatted} ₴`;
}

/** Delta without currency: −4 100 / +1 200 (from our POV: + = we cheaper) */
function shortDelta(n: number, locale: string): string {
  const abs = new Intl.NumberFormat(
    locale === "ru" ? "ru-UA" : "uk-UA",
    { maximumFractionDigits: 0 }
  ).format(Math.abs(n));
  if (n > 0) return `−${abs}`;
  if (n < 0) return `+${abs}`;
  return "≈";
}

type Tone = "cheaper" | "expensive" | "equal";

function toneFrom(saving: number): Tone {
  if (saving >= 100) return "cheaper";
  if (saving <= -100) return "expensive";
  return "equal";
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

  // Always show when we have competitor price data (even if we are more expensive)
  if (!compare?.lines?.length) return null;

  const isRu = locale === "ru";
  const saving = compare.bestSavingUah;
  const name = compare.bestCompetitorName;
  const tone = toneFrom(saving);

  const styles =
    tone === "cheaper"
      ? {
          bg: "rgba(22, 163, 74, 0.16)",
          border: "rgba(52, 211, 153, 0.32)",
          ring: "focus-visible:ring-emerald-500/40",
          title: "text-emerald-300",
          sub: "text-emerald-200/75",
          subStrong: "text-emerald-100/90",
          stale: "text-emerald-200/50",
        }
      : tone === "expensive"
        ? {
            bg: "rgba(245, 158, 11, 0.14)",
            border: "rgba(251, 191, 36, 0.35)",
            ring: "focus-visible:ring-amber-500/40",
            title: "text-amber-300",
            sub: "text-amber-200/75",
            subStrong: "text-amber-100/90",
            stale: "text-amber-200/50",
          }
        : {
            bg: "rgba(148, 163, 184, 0.12)",
            border: "rgba(148, 163, 184, 0.28)",
            ring: "focus-visible:ring-slate-400/40",
            title: "text-slate-300",
            sub: "text-slate-400/90",
            subStrong: "text-slate-200/90",
            stale: "text-slate-500",
          };

  const headline =
    tone === "cheaper"
      ? {
          arrow: "↓",
          amount: shortUah(saving, locale),
          word: isRu ? "дешевле" : "дешевше",
          vs: isRu ? "чем" : "ніж",
        }
      : tone === "expensive"
        ? {
            arrow: "↑",
            amount: shortUah(saving, locale),
            word: isRu ? "дороже" : "дорожче",
            vs: isRu ? "чем" : "ніж",
          }
        : {
            arrow: "≈",
            amount: "",
            word: isRu ? "как у рынка" : "як у ринку",
            vs: isRu ? "рядом с" : "поруч з",
          };

  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      <button
        type="button"
        className={cn(
          "flex w-full min-w-0 flex-col gap-0.5 overflow-hidden rounded-xl",
          "px-2.5 py-2 text-left transition",
          "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2",
          styles.ring
        )}
        style={{
          background: styles.bg,
          border: `1px solid ${styles.border}`,
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
            "sm:text-[0.875rem]",
            styles.title
          )}
        >
          <span className="shrink-0 opacity-90" aria-hidden>
            {headline.arrow}
          </span>
          <span className="min-w-0 truncate tabular-nums">
            {headline.amount ? (
              <>
                {headline.amount}
                <span className="ml-1 font-medium tracking-normal opacity-90">
                  {headline.word}
                </span>
              </>
            ) : (
              <span className="font-medium tracking-normal">{headline.word}</span>
            )}
          </span>
        </span>
        <span
          className={cn(
            "block min-w-0 truncate pl-4",
            "font-sans text-[0.6875rem] font-medium leading-snug",
            "tracking-wide sm:text-[0.75rem]",
            styles.sub
          )}
          title={`${headline.vs} ${name}`}
        >
          {headline.vs}{" "}
          <span className={styles.subStrong}>{name}</span>
          {compare.isStale ? (
            <span className={styles.stale}>
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
            "absolute bottom-full left-0 z-50 mb-1.5",
            "w-[min(100%,15rem)]",
            "rounded-lg px-2.5 py-2 shadow-xl"
          )}
          style={{
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
