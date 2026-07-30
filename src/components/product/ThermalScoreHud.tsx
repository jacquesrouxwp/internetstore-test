"use client";

/**
 * Semi-transparent score HUD over the thermal canvas.
 * Distance/target come from the simulator — single source of truth.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  scoreColorClass,
  type Specs,
} from "@/lib/thermal/thermal-score";
import {
  catalogMedianPerfAtDistance,
  crossoverM,
  gapPct,
  performanceAtDistance,
  pickComparePeer,
  scoresAtDistance,
  sensorFromSpecs,
  type CatalogPeer,
  type ScoreTargetId,
} from "@/lib/thermal/thermal-score-distance";
import type { ThermalTargetId } from "@/lib/thermal/targets";

function mutedScoreColor(score: number): string {
  const band = scoreColorClass(score);
  if (band === "high") return "text-emerald-400/85";
  if (band === "mid") return "text-amber-300/80";
  return "text-red-400/75";
}

function toScoreTarget(id: ThermalTargetId): ScoreTargetId {
  if (id === "human" || id === "deer" || id === "boar" || id === "fox")
    return id;
  return "deer";
}

type Props = {
  specs: Specs;
  distanceM: number;
  targetId: ThermalTargetId;
  catalogPeers?: CatalogPeer[];
  productId?: string;
  productName?: string;
  percentilePerf?: number | null;
  locale?: string;
  className?: string;
  /**
   * Always show 4 sub-scores (presentation / dual-panel mode).
   * Default true — scores must be visible in the corner without an extra click.
   */
  alwaysShowBreakdown?: boolean;
  /** Hide auto peer/median insight when dual A/B compare owns that UI. */
  hidePeerInsight?: boolean;
};

export function ThermalScoreHud({
  specs,
  distanceM,
  targetId,
  catalogPeers = [],
  productId,
  productName,
  percentilePerf,
  locale: _locale = "uk",
  className,
  alwaysShowBreakdown = true,
  hidePeerInsight = false,
}: Props) {
  void _locale;
  const t = useTranslations("product");
  const [expanded, setExpanded] = useState(alwaysShowBreakdown);
  const [tip, setTip] = useState(false);

  // Debounce ~50ms so slider stays smooth
  const [dLive, setDLive] = useState(distanceM);
  useEffect(() => {
    const id = window.setTimeout(() => setDLive(distanceM), 50);
    return () => window.clearTimeout(id);
  }, [distanceM]);

  const target = toScoreTarget(targetId);
  const sensor = useMemo(() => sensorFromSpecs(specs), [specs]);

  const live = useMemo(
    () => scoresAtDistance(specs, sensor, dLive, target),
    [specs, sensor, dLive, target]
  );

  const insight = useMemo(() => {
    if (hidePeerInsight || !catalogPeers.length) {
      return {
        gapMedian: null as number | null,
        gapPeer: null as number | null,
        peerName: null as string | null,
        cross: null as number | null,
      };
    }
    const self: CatalogPeer = {
      id: productId || "self",
      name: productName || "—",
      specs,
      sensor,
      priceEur: specs.priceEur,
    };
    const peer = pickComparePeer(self, catalogPeers, dLive, target);
    const median = catalogMedianPerfAtDistance(catalogPeers, dLive, target);
    const gapMedian =
      median != null && median > 0
        ? gapPct(live.thermalPerformance, median)
        : null;

    let gapPeer: number | null = null;
    let peerName: string | null = null;
    let cross: number | null = null;
    if (peer) {
      const pp = performanceAtDistance(
        peer.specs,
        peer.sensor,
        dLive,
        target
      );
      gapPeer = gapPct(live.thermalPerformance, pp);
      peerName = peer.name;
      const selfBetter =
        performanceAtDistance(specs, sensor, 1500, target) >=
        performanceAtDistance(peer.specs, peer.sensor, 1500, target);
      if (selfBetter) {
        cross = crossoverM(
          { s: peer.specs, sensor: peer.sensor },
          { s: specs, sensor },
          8,
          target
        );
      } else {
        cross = crossoverM(
          { s: specs, sensor },
          { s: peer.specs, sensor: peer.sensor },
          8,
          target
        );
      }
    }

    return { gapMedian, gapPeer, peerName, cross };
  }, [
    hidePeerInsight,
    specs,
    sensor,
    catalogPeers,
    dLive,
    target,
    live.thermalPerformance,
    productId,
    productName,
  ]);

  const totalColor = mutedScoreColor(live.total);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute right-2 top-2 z-20 max-w-[min(100%-1rem,11.5rem)] sm:right-2.5 sm:top-2.5 sm:max-w-[13rem]",
        className
      )}
    >
      <div
        className="rounded-[10px] border border-white/[0.08] px-2.5 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
        style={{
          background: "rgba(10,12,16,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {/* Compact header */}
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-medium uppercase tracking-wide text-white/45">
                {t("scoreTotal")}
              </span>
              <button
                type="button"
                className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[8px] font-bold text-white/50 hover:border-white/40 hover:text-white/80"
                aria-label={t("scoreWhy")}
                onClick={(e) => {
                  e.stopPropagation();
                  setTip((v) => !v);
                }}
              >
                i
              </button>
            </div>
            <p
              className={cn(
                "font-display text-[1.35rem] font-bold leading-none tabular-nums tracking-tight sm:text-[1.5rem]",
                totalColor
              )}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {live.total}
              <span className="text-[0.7rem] font-semibold text-white/40">
                /100
              </span>
            </p>
            {percentilePerf != null && (
              <p className="mt-0.5 truncate text-[9px] leading-tight text-white/50">
                {t("scoreBetterThan", { pct: percentilePerf })}
              </p>
            )}
            <p className="mt-0.5 text-[8px] tabular-nums text-white/35">
              {dLive} m · px≈{live.pixelsOnTarget.toFixed(1)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/12 text-[11px] text-white/55 hover:border-white/25 hover:text-white/80"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        {tip && (
          <p className="mt-1.5 border-t border-white/[0.06] pt-1.5 text-[8px] leading-snug text-white/55">
            {t("scoreHudTooltip")}
          </p>
        )}

        {/* 4 sub-scores (+ optional peer insight when not dual-compare) */}
        {(expanded || alwaysShowBreakdown) && (
          <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
            {(
              [
                ["thermalPerformance", t("scoreThermalPerf")],
                ["detectionRange", t("scoreDetection")],
                ["imageQuality", t("scoreImageQuality")],
                ["valueForMoney", t("scoreValue")],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-2 text-[9px]"
              >
                <span className="truncate text-white/45">{label}</span>
                <span
                  className={cn(
                    "shrink-0 font-semibold tabular-nums",
                    mutedScoreColor(live[key])
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {live[key]}
                </span>
              </div>
            ))}

            {!hidePeerInsight && insight.gapMedian != null && (
              <p className="pt-1 text-[8px] leading-snug text-white/50">
                {insight.gapMedian >= 0
                  ? t("scoreGapBetterMedian", {
                      pct: Math.abs(insight.gapMedian),
                      d: dLive,
                    })
                  : t("scoreGapWorseMedian", {
                      pct: Math.abs(insight.gapMedian),
                      d: dLive,
                    })}
              </p>
            )}
            {!hidePeerInsight && insight.cross != null && insight.peerName && (
              <p className="text-[8px] leading-snug text-white/60">
                {t("scoreCrossover", {
                  m: insight.cross,
                  name: insight.peerName,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
