"use client";

/**
 * Live A/B gap strip for dual-model thermal compare.
 * Shows % difference at the shared distance, crossover insight, and expandable math.
 */

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Specs } from "@/lib/thermal/thermal-score";
import {
  crossoverM,
  gapPct,
  performanceAtDistance,
  pixelsOnTarget,
  resolveScore,
  sensorFromSpecs,
  type ScoreTargetId,
  type Sensor,
} from "@/lib/thermal/thermal-score-distance";
import type { ThermalTargetId } from "@/lib/thermal/targets";

function toScoreTarget(id: ThermalTargetId): ScoreTargetId {
  if (id === "human" || id === "deer" || id === "boar" || id === "fox")
    return id;
  return "deer";
}

export type CompareSide = {
  name: string;
  specs: Specs;
  sensor?: Sensor;
};

type Props = {
  modelA: CompareSide;
  modelB: CompareSide;
  distanceM: number;
  targetId: ThermalTargetId;
  locale?: string;
  className?: string;
};

export function ThermalCompareInsight({
  modelA,
  modelB,
  distanceM,
  targetId,
  locale = "uk",
  className,
}: Props) {
  const isRu = locale === "ru";
  const [mathOpen, setMathOpen] = useState(false);

  // Debounce with the same cadence as score HUD so numbers stay in lockstep
  const [dLive, setDLive] = useState(distanceM);
  useEffect(() => {
    const id = window.setTimeout(() => setDLive(distanceM), 50);
    return () => window.clearTimeout(id);
  }, [distanceM]);

  const target = toScoreTarget(targetId);

  const live = useMemo(() => {
    const sensorA = modelA.sensor ?? sensorFromSpecs(modelA.specs);
    const sensorB = modelB.sensor ?? sensorFromSpecs(modelB.specs);
    const perfA = performanceAtDistance(modelA.specs, sensorA, dLive, target);
    const perfB = performanceAtDistance(modelB.specs, sensorB, dLive, target);
    const pxA = pixelsOnTarget(sensorA, target, dLive);
    const pxB = pixelsOnTarget(sensorB, target, dLive);
    const resolveA = resolveScore(pxA);
    const resolveB = resolveScore(pxB);
    // gap of B vs A: positive → B better
    const gapBvsA = gapPct(perfB, perfA);
    const gapAvsB = gapPct(perfA, perfB);
    const bBetter = perfB >= perfA;
    const absGap = Math.abs(gapBvsA);

    // Crossover: distance from which the stronger long-range model pulls ≥8%
    const aFar = performanceAtDistance(modelA.specs, sensorA, 1500, target);
    const bFar = performanceAtDistance(modelB.specs, sensorB, 1500, target);
    let cross: number;
    let strongerName: string;
    if (bFar >= aFar) {
      cross = crossoverM(
        { s: modelA.specs, sensor: sensorA },
        { s: modelB.specs, sensor: sensorB },
        8,
        target
      );
      strongerName = modelB.name;
    } else {
      cross = crossoverM(
        { s: modelB.specs, sensor: sensorB },
        { s: modelA.specs, sensor: sensorA },
        8,
        target
      );
      strongerName = modelA.name;
    }

    return {
      sensorA,
      sensorB,
      perfA,
      perfB,
      pxA,
      pxB,
      resolveA,
      resolveB,
      gapBvsA,
      gapAvsB,
      bBetter,
      absGap,
      cross,
      strongerName,
      dA: modelA.specs.detectionRangeM,
      dB: modelB.specs.detectionRangeM,
    };
  }, [modelA, modelB, dLive, target]);

  // Visual bar: map |gap| 0…50% → fill width 0…100%
  const barPct = Math.min(100, (live.absGap / 50) * 100);
  const barSide = live.bBetter ? "right" : "left";

  const headline =
    live.absGap < 3
      ? isRu
        ? `На ${dLive} м модели почти равны (разрыв ${live.absGap}%)`
        : `На ${dLive} м моделі майже рівні (розрив ${live.absGap}%)`
      : live.bBetter
        ? isRu
          ? `На ${dLive} м модель B лучше A на ${live.absGap}%`
          : `На ${dLive} м модель B краща за A на ${live.absGap}%`
        : isRu
          ? `На ${dLive} м модель A лучше B на ${live.absGap}%`
          : `На ${dLive} м модель A краща за B на ${live.absGap}%`;

  const crossoverText = isRu
    ? `До ~${live.cross} м разница несущественна — можно брать дешевле; дальше преимущество «${live.strongerName}» растёт`
    : `До ~${live.cross} м різниця несуттєва — можна брати дешевше; далі перевага «${live.strongerName}» зростає`;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 px-3 py-3 sm:px-4 sm:py-3.5",
        className
      )}
      style={{
        background: "rgba(10,12,16,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {isRu ? "Сравнение A vs B" : "Порівняння A vs B"}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-primary sm:text-base">
            {headline}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-secondary">
            {crossoverText}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMathOpen((v) => !v)}
          className={cn(
            "shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
            mathOpen
              ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
              : "border-white/15 text-secondary hover:border-white/30"
          )}
          aria-expanded={mathOpen}
        >
          {isRu ? "Математика" : "Математика"}
        </button>
      </div>

      {/* Gap bar: center = equal; fill leans to the better side */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[9px] uppercase tracking-wide text-white/35">
          <span className="truncate max-w-[40%]">A · {modelA.name}</span>
          <span className="tabular-nums text-white/50">{live.absGap}%</span>
          <span className="truncate max-w-[40%] text-right">
            B · {modelB.name}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
          <div
            className={cn(
              "absolute inset-y-0 rounded-full transition-all duration-150",
              live.absGap < 3
                ? "left-[calc(50%-4%)] w-[8%] bg-white/25"
                : barSide === "right"
                  ? "left-1/2 bg-gradient-to-r from-emerald-500/70 to-emerald-400/90"
                  : "right-1/2 bg-gradient-to-l from-sky-500/70 to-sky-400/90"
            )}
            style={
              live.absGap < 3
                ? undefined
                : barSide === "right"
                  ? { width: `${barPct / 2}%` }
                  : { width: `${barPct / 2}%` }
            }
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/45">
          <span>
            Total {live.perfA}
            <span className="text-white/30">/100</span>
          </span>
          <span>
            Total {live.perfB}
            <span className="text-white/30">/100</span>
          </span>
        </div>
      </div>

      {mathOpen && (
        <div className="mt-3 space-y-2 border-t border-white/[0.08] pt-3 text-[11px] leading-relaxed text-secondary">
          <p className="font-semibold text-primary">
            {isRu
              ? "Строгая математика (критерий Джонсона)"
              : "Строга математика (критерій Джонсона)"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <MathCard
              label="A"
              name={modelA.name}
              d={live.dA}
              px={live.pxA}
              resolve={live.resolveA}
              perf={live.perfA}
              isRu={isRu}
            />
            <MathCard
              label="B"
              name={modelB.name}
              d={live.dB}
              px={live.pxB}
              resolve={live.resolveB}
              perf={live.perfB}
              isRu={isRu}
            />
          </div>
          <ul className="list-disc space-y-1 pl-4 text-[10px] text-faint">
            <li>
              px = 2 × D<sub>target</sub> / d · d = {dLive} м
            </li>
            <li>
              resolveScore(px) · Johnson 2 / 8 / 13 → 52 / 85 / 97
            </li>
            <li>
              performance = 0.92·resolve + 0.05·IQ + 0.03·NETD
            </li>
            <li>
              gap% = (perf<sub>better</sub> − perf<sub>other</sub>) / perf
              <sub>other</sub> × 100
              {live.bBetter
                ? ` → gap(B,A) = ${live.gapBvsA}%`
                : ` → gap(A,B) = ${live.gapAvsB}%`}
            </li>
            <li>
              crossover ≈ {live.cross} м (порог 8% для «
              {live.strongerName}»)
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function MathCard({
  label,
  name,
  d,
  px,
  resolve,
  perf,
  isRu,
}: {
  label: string;
  name: string;
  d: number;
  px: number;
  resolve: number;
  perf: number;
  isRu: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
        {label} · <span className="normal-case text-primary">{name}</span>
      </p>
      <dl className="mt-1.5 space-y-0.5 tabular-nums text-[10px]">
        <div className="flex justify-between gap-2">
          <dt className="text-faint">D (паспорт)</dt>
          <dd className="text-secondary">{d} м</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-faint">
            {isRu ? "px на цели" : "px на цілі"}
          </dt>
          <dd className="text-secondary">{px.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-faint">resolveScore</dt>
          <dd className="text-secondary">{resolve.toFixed(1)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-faint">performance</dt>
          <dd className="font-semibold text-primary">{perf}/100</dd>
        </div>
      </dl>
    </div>
  );
}
