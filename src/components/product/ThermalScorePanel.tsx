"use client";

/**
 * Catalog Thermal Performance Score badge (static base score — no distance).
 * Live distance-aware scores live inside ThermalSimulator A/B HUDs.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { scoreColorClass } from "@/lib/thermal/thermal-score";

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

/** Compact catalog badge (static base score — no distance) */
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
