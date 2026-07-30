"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  scoreColorClass,
  type ScoreBreakdown,
  type ThermalScores,
} from "@/lib/thermal/thermal-score";

type ScoreKey = keyof ThermalScores;

const SCORE_KEYS: ScoreKey[] = [
  "thermalPerformance",
  "detectionRange",
  "imageQuality",
  "valueForMoney",
];

function colorClasses(score: number) {
  const band = scoreColorClass(score);
  if (band === "high")
    return {
      ring: "border-emerald-500/40 bg-emerald-500/10",
      num: "text-emerald-400",
    };
  if (band === "mid")
    return {
      ring: "border-amber-500/40 bg-amber-500/10",
      num: "text-amber-300",
    };
  return {
    ring: "border-red-500/40 bg-red-500/10",
    num: "text-red-400",
  };
}

function factorLabel(
  t: ReturnType<typeof useTranslations>,
  code: string,
  specs: ScoreBreakdown["specs"]
): string {
  if (code.startsWith("matrix_")) {
    const m = code.replace("matrix_", "");
    return t("scoreFactorMatrix", { matrix: m });
  }
  if (code.startsWith("netd_")) {
    return t("scoreFactorNetd", { netd: code.replace("netd_", "") });
  }
  if (code.startsWith("refresh_")) {
    return t("scoreFactorRefresh", { hz: code.replace("refresh_", "") });
  }
  if (code.startsWith("detection_m_")) {
    return t("scoreFactorDetection", {
      m: code.replace("detection_m_", ""),
    });
  }
  if (code.startsWith("perf_")) {
    return t("scoreFactorPerf", { n: code.replace("perf_", "") });
  }
  if (code.startsWith("price_eur_")) {
    return t("scoreFactorPrice", { eur: code.replace("price_eur_", "") });
  }
  if (code.startsWith("iq_w_")) {
    return t("scoreFactorIqBlend");
  }
  // fallback with live specs
  return t("scoreFactorGeneric", {
    matrix: `${specs.hPixels}×${specs.vPixels}`,
    netd: specs.netdMk,
    hz: specs.refreshHz,
    d: specs.detectionRangeM,
  });
}

export function ThermalScorePanel({
  breakdown,
  percentilePerf,
  className,
}: {
  breakdown: ScoreBreakdown;
  /** «краще за X%» for thermalPerformance */
  percentilePerf?: number | null;
  className?: string;
}) {
  const t = useTranslations("product");
  const [open, setOpen] = useState<ScoreKey | null>(null);
  const { scores, specs, factors } = breakdown;

  const titles: Record<ScoreKey, string> = {
    thermalPerformance: t("scoreThermalPerf"),
    detectionRange: t("scoreDetection"),
    imageQuality: t("scoreImageQuality"),
    valueForMoney: t("scoreValue"),
  };

  return (
    <section
      className={cn(
        "product-panel rounded-[var(--radius-card)] border border-white/[0.1] p-5 sm:p-6",
        className
      )}
      style={{ background: "var(--surface)" }}
      aria-label={t("scoreTitle")}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="product-panel__title mb-0 text-lg font-bold text-primary">
          {t("scoreTitle")}
        </h2>
        {percentilePerf != null && (
          <p className="text-xs text-secondary">
            {t("scorePercentile", { pct: percentilePerf })}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCORE_KEYS.map((key) => {
          const n = scores[key];
          const c = colorClasses(n);
          const isOpen = open === key;
          return (
            <div
              key={key}
              className={cn(
                "flex flex-col rounded-xl border px-3 py-3",
                c.ring
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium leading-snug text-secondary">
                  {titles[key]}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="shrink-0 rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-faint hover:border-white/30 hover:text-secondary"
                  aria-expanded={isOpen}
                >
                  {t("scoreWhy")}
                </button>
              </div>
              <p
                className={cn(
                  "mt-2 font-display text-3xl font-bold tabular-nums tracking-tight",
                  c.num
                )}
              >
                {n}
                <span className="text-base font-semibold text-faint">/100</span>
              </p>
              {key === "thermalPerformance" && percentilePerf != null && (
                <p className="mt-1 text-[10px] text-faint">
                  {t("scoreBetterThan", { pct: percentilePerf })}
                </p>
              )}
              {isOpen && (
                <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[10px] leading-snug text-secondary">
                  {factors[key].map((code) => (
                    <li key={code}>• {factorLabel(t, code, specs)}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-faint">
        {t("scoreDisclaimer")}
      </p>
    </section>
  );
}

/** Compact catalog badge */
export function ThermalScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const t = useTranslations("product");
  const c = colorClasses(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums",
        c.ring,
        c.num,
        className
      )}
      title={t("scoreBadgeTitle")}
    >
      {t("scoreBadge", { n: score })}
    </span>
  );
}
