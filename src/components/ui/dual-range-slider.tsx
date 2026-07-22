"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DualRangeSliderProps = {
  /** Absolute min from category data */
  min: number;
  /** Absolute max from category data */
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  unit?: string;
  label?: string;
  /** Debounced change (~200ms) */
  onChange: (min: number, max: number) => void;
  className?: string;
};

/**
 * Reusable dual-range slider with min/max number inputs.
 * Dark-theme optics store style: red fill, soft track, white thumbs.
 */
export function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  step = 1,
  unit = "м",
  label,
  onChange,
  className,
}: DualRangeSliderProps) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;

  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from URL / parent when external values change
  useEffect(() => {
    setLocalMin(Math.max(safeMin, Math.min(valueMin, safeMax)));
    setLocalMax(Math.min(safeMax, Math.max(valueMax, safeMin)));
  }, [valueMin, valueMax, safeMin, safeMax]);

  const emit = useCallback(
    (nextMin: number, nextMax: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(nextMin, nextMax);
      }, 200);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const clampPair = (a: number, b: number) => {
    let lo = Math.round(Math.max(safeMin, Math.min(a, safeMax)));
    let hi = Math.round(Math.max(safeMin, Math.min(b, safeMax)));
    if (lo > hi) [lo, hi] = [hi, lo];
    return { lo, hi };
  };

  const setMin = (raw: number) => {
    const { lo, hi } = clampPair(raw, localMax);
    // keep min ≤ max: if dragging min past max, pin max
    const nextMin = Math.min(lo, hi);
    const nextMax = Math.max(lo, hi);
    setLocalMin(nextMin);
    setLocalMax(nextMax);
    emit(nextMin, nextMax);
  };

  const setMax = (raw: number) => {
    const { lo, hi } = clampPair(localMin, raw);
    const nextMin = Math.min(lo, hi);
    const nextMax = Math.max(lo, hi);
    setLocalMin(nextMin);
    setLocalMax(nextMax);
    emit(nextMin, nextMax);
  };

  const range = safeMax - safeMin || 1;
  const leftPct = ((localMin - safeMin) / range) * 100;
  const rightPct = ((localMax - safeMin) / range) * 100;

  const fillStyle = useMemo(
    () => ({
      left: `${leftPct}%`,
      width: `${Math.max(0, rightPct - leftPct)}%`,
    }),
    [leftPct, rightPct]
  );

  if (safeMax <= safeMin) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <p className="text-sm font-medium text-primary">{label}</p>
      )}
      <p className="text-sm font-semibold tabular-nums text-primary">
        {localMin.toLocaleString("uk-UA")} — {localMax.toLocaleString("uk-UA")}{" "}
        {unit}
      </p>

      <div className="dual-range relative h-8 select-none px-0.5">
        {/* Track */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        {/* Active fill */}
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            ...fillStyle,
            background: "var(--accent, #E11D2A)",
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={localMin}
          aria-label="Min"
          onChange={(e) => {
            const v = Number(e.target.value);
            // prevent crossing: min cannot exceed max
            setMin(Math.min(v, localMax));
          }}
          className="dual-range__input dual-range__input--min"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={localMax}
          aria-label="Max"
          onChange={(e) => {
            const v = Number(e.target.value);
            setMax(Math.max(v, localMin));
          }}
          className="dual-range__input dual-range__input--max"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          className="input text-center tabular-nums"
          min={safeMin}
          max={safeMax}
          step={step}
          value={localMin}
          onChange={(e) => {
            const v = e.target.value === "" ? safeMin : Number(e.target.value);
            setMin(Math.min(v, localMax));
          }}
          aria-label="Min value"
        />
        <span className="text-muted-ui">—</span>
        <input
          type="number"
          className="input text-center tabular-nums"
          min={safeMin}
          max={safeMax}
          step={step}
          value={localMax}
          onChange={(e) => {
            const v = e.target.value === "" ? safeMax : Number(e.target.value);
            setMax(Math.max(v, localMin));
          }}
          aria-label="Max value"
        />
      </div>

      <style jsx>{`
        .dual-range__input {
          pointer-events: none;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          appearance: none;
          background: transparent;
          outline: none;
        }
        .dual-range__input::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          position: relative;
          z-index: 3;
        }
        .dual-range__input::-moz-range-thumb {
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }
        .dual-range__input::-webkit-slider-runnable-track {
          appearance: none;
          height: 6px;
          background: transparent;
        }
        .dual-range__input::-moz-range-track {
          height: 6px;
          background: transparent;
          border: none;
        }
        .dual-range__input--min {
          z-index: 2;
        }
        .dual-range__input--max {
          z-index: 3;
        }
      `}</style>
    </div>
  );
}

export default DualRangeSlider;
