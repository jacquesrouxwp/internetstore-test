"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  scoreColorClass,
  type ScoreBreakdown,
  type Specs,
  type ThermalScores,
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

type ScoreKey = keyof ThermalScores;

const SCORE_KEYS: ScoreKey[] = [
  "thermalPerformance",
  "detectionRange",
  "imageQuality",
  "valueForMoney",
];

const TARGETS: { id: ScoreTargetId; uk: string; ru: string }[] = [
  { id: "human", uk: "Людина", ru: "Человек" },
  { id: "deer", uk: "Олень", ru: "Олень" },
  { id: "boar", uk: "Кабан", ru: "Кабан" },
  { id: "fox", uk: "Лисиця", ru: "Лисица" },
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

export function ThermalScorePanel({
  breakdown,
  percentilePerf,
  catalogPeers = [],
  productId,
  productName,
  className,
  locale = "uk",
}: {
  breakdown: ScoreBreakdown;
  percentilePerf?: number | null;
  /** Peers for gap % + crossover (serialized Specs) */
  catalogPeers?: CatalogPeer[];
  productId?: string;
  productName?: string;
  className?: string;
  locale?: string;
}) {
  const t = useTranslations("product");
  const isRu = locale === "ru";
  const { specs } = breakdown;
  const sensor = useMemo(() => sensorFromSpecs(specs), [specs]);

  const maxD = Math.max(400, Math.round(specs.detectionRangeM * 1.15));
  const [distance, setDistance] = useState(() =>
    Math.min(400, Math.max(50, Math.round(specs.detectionRangeM * 0.25)))
  );
  const [target, setTarget] = useState<ScoreTargetId>("human");
  const [open, setOpen] = useState<ScoreKey | "total" | null>(null);

  const live = useMemo(
    () => scoresAtDistance(specs, sensor, distance, target),
    [specs, sensor, distance, target]
  );

  const selfPeer: CatalogPeer = useMemo(
    () => ({
      id: productId || "self",
      name: productName || "—",
      specs,
      sensor,
      priceEur: specs.priceEur,
    }),
    [productId, productName, specs, sensor]
  );

  const compare = useMemo(() => {
    const peer = pickComparePeer(selfPeer, catalogPeers, distance, target);
    const myPerf = live.thermalPerformance;
    const medianPerf = catalogPeers.length
      ? catalogMedianPerfAtDistance(catalogPeers, distance, target)
      : null;

    let gapVsPeer: number | null = null;
    let peerName: string | null = null;
    if (peer) {
      const peerPerf = performanceAtDistance(
        peer.specs,
        peer.sensor,
        distance,
        target
      );
      gapVsPeer = gapPct(myPerf, peerPerf);
      peerName = peer.name;
    }

    let gapVsMedian: number | null = null;
    if (medianPerf != null && medianPerf > 0) {
      gapVsMedian = gapPct(myPerf, medianPerf);
    }

    // Crossover: this product vs cheaper peer (or median peer)
    let cross: number | null = null;
    let crossPeerName: string | null = null;
    if (peer) {
      const selfIsBetter =
        performanceAtDistance(specs, sensor, 1500, target) >=
        performanceAtDistance(peer.specs, peer.sensor, 1500, target);
      if (selfIsBetter && peer.priceEur <= specs.priceEur) {
        cross = crossoverM(
          { s: peer.specs, sensor: peer.sensor },
          { s: specs, sensor },
          8,
          target
        );
        crossPeerName = peer.name;
      } else if (!selfIsBetter && specs.priceEur <= peer.priceEur) {
        cross = crossoverM(
          { s: specs, sensor },
          { s: peer.specs, sensor: peer.sensor },
          8,
          target
        );
        crossPeerName = peer.name;
      } else if (selfIsBetter) {
        cross = crossoverM(
          { s: peer.specs, sensor: peer.sensor },
          { s: specs, sensor },
          8,
          target
        );
        crossPeerName = peer.name;
      }
    }

    return { gapVsPeer, peerName, gapVsMedian, cross, crossPeerName, myPerf };
  }, [
    selfPeer,
    catalogPeers,
    distance,
    target,
    live.thermalPerformance,
    specs,
    sensor,
  ]);

  const titles: Record<ScoreKey, string> = {
    thermalPerformance: t("scoreThermalPerf"),
    detectionRange: t("scoreDetection"),
    imageQuality: t("scoreImageQuality"),
    valueForMoney: t("scoreValue"),
  };

  const displayScores: ThermalScores = {
    thermalPerformance: live.thermalPerformance,
    detectionRange: live.detectionRange,
    imageQuality: live.imageQuality,
    valueForMoney: live.valueForMoney,
  };

  const whyLines = (key: ScoreKey | "total"): string[] => {
    const px = live.pixelsOnTarget.toFixed(1);
    const base = [
      t("scoreDistanceWhyJohnson", { px, d: distance }),
      t("scoreDistanceWhyNetd", { netd: specs.netdMk }),
      t("scoreDistanceWhyMatrix", {
        matrix: `${specs.hPixels}×${specs.vPixels}`,
      }),
    ];
    if (key === "valueForMoney") {
      return [
        ...base,
        t("scoreFactorPrice", { eur: Math.round(specs.priceEur) }),
      ];
    }
    if (key === "detectionRange") {
      return [t("scoreDistanceWhyJohnson", { px, d: distance })];
    }
    return base;
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
        <div>
          <h2 className="product-panel__title mb-0 text-lg font-bold text-primary">
            {t("scoreTitle")}
          </h2>
          <p className="mt-1 text-xs text-secondary">{t("scoreDistanceHint")}</p>
        </div>
        {percentilePerf != null && (
          <p className="text-xs text-secondary">
            {t("scorePercentile", { pct: percentilePerf })}
          </p>
        )}
      </div>

      {/* Distance slider */}
      <div className="mb-4">
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-medium text-muted-ui">
            <span>{t("scoreDistance")}</span>
            <span className="tabular-nums text-primary">
              {distance} {t("scoreMeters")}
            </span>
          </span>
          <input
            type="range"
            min={50}
            max={maxD}
            step={10}
            value={Math.min(distance, maxD)}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="thermal-range w-full"
          />
        </label>
      </div>

      {/* Target switcher */}
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-muted-ui">
          {t("scoreTarget")}
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGETS.map((tg) => (
            <button
              key={tg.id}
              type="button"
              onClick={() => setTarget(tg.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                target === tg.id
                  ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                  : "border-white/10 text-secondary hover:border-white/20"
              )}
            >
              {isRu ? tg.ru : tg.uk}
            </button>
          ))}
        </div>
      </div>

      {/* Total score */}
      <div
        className={cn(
          "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
          colorClasses(live.total).ring
        )}
      >
        <div>
          <p className="text-[11px] font-medium text-secondary">
            {t("scoreTotal")}
          </p>
          <p
            className={cn(
              "font-display text-4xl font-bold tabular-nums",
              colorClasses(live.total).num
            )}
          >
            {live.total}
            <span className="text-lg text-faint">/100</span>
          </p>
          <p className="mt-0.5 text-[10px] text-faint">
            {t("scoreAtDistance", { d: distance })} · px≈
            {live.pixelsOnTarget.toFixed(1)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(open === "total" ? null : "total")}
          className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-semibold text-faint hover:border-white/30"
        >
          {t("scoreWhy")}
        </button>
      </div>
      {open === "total" && (
        <ul className="mb-4 -mt-2 space-y-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-secondary">
          {whyLines("total").map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      )}

      {/* Gap insight */}
      <div className="mb-4 space-y-1.5 rounded-lg border border-white/10 bg-black/15 px-3 py-2.5 text-xs text-secondary">
        {compare.gapVsMedian != null && (
          <p>
            {compare.gapVsMedian >= 0
              ? t("scoreGapBetterMedian", {
                  pct: Math.abs(compare.gapVsMedian),
                  d: distance,
                })
              : t("scoreGapWorseMedian", {
                  pct: Math.abs(compare.gapVsMedian),
                  d: distance,
                })}
          </p>
        )}
        {compare.peerName && compare.gapVsPeer != null && (
          <p>
            {compare.gapVsPeer >= 0
              ? t("scoreGapBetterPeer", {
                  pct: Math.abs(compare.gapVsPeer),
                  name: compare.peerName,
                  d: distance,
                })
              : t("scoreGapWorsePeer", {
                  pct: Math.abs(compare.gapVsPeer),
                  name: compare.peerName,
                  d: distance,
                })}
          </p>
        )}
        {compare.cross != null && compare.crossPeerName && (
          <p className="font-medium text-primary">
            {t("scoreCrossover", {
              m: compare.cross,
              name: compare.crossPeerName,
            })}
          </p>
        )}
      </div>

      {/* 4 cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCORE_KEYS.map((key) => {
          const n = displayScores[key];
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
              {isOpen && (
                <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[10px] leading-snug text-secondary">
                  {whyLines(key).map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-faint">
        {t("scoreDistanceDisclaimer")}
      </p>
    </section>
  );
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

/** Serialize peer for server → client */
export function peerFromSpecs(
  id: string,
  name: string,
  specs: Specs
): CatalogPeer {
  return {
    id,
    name,
    specs,
    sensor: sensorFromSpecs(specs),
    priceEur: specs.priceEur,
  };
}
