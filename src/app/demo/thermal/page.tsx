"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ThermalMatrix, ThermalSimParams } from "@/lib/thermal/parse-product-thermal";
import {
  defaultDetectionRangeM,
  defaultNetdMk,
} from "@/lib/thermal/parse-product-thermal";

const ThermalSimulator3D = dynamic(
  () =>
    import("@/components/product/ThermalSimulator3D").then(
      (m) => m.ThermalSimulator3D
    ),
  { ssr: false, loading: () => <p className="text-white/60">Loading 3D…</p> }
);

/**
 * Standalone preview harness for the thermal simulator.
 * No Supabase / i18n needed — used to iterate on the canvas rendering.
 * Visit /demo/thermal
 */
export default function ThermalDemoPage() {
  const [matrix, setMatrix] = useState<ThermalMatrix>(640);
  const params: ThermalSimParams = {
    matrix,
    detectionRangeM: defaultDetectionRangeM(matrix),
    netdMk: defaultNetdMk(matrix),
    refreshRateHz: 50,
    label: `Demo ${matrix}`,
    focalMm: matrix >= 640 ? 35 : matrix >= 384 ? 25 : 19,
    pitchUm: 12,
  };

  return (
    <main className="min-h-screen bg-[#0a0b10] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-bold">Thermal Simulator — dev preview</h1>
        <div className="mb-6 flex gap-2">
          {([256, 384, 640] as ThermalMatrix[]).map((m) => (
            <button
              key={m}
              onClick={() => setMatrix(m)}
              className={`rounded px-3 py-1.5 text-sm ${
                matrix === m ? "bg-red-600" : "bg-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <ThermalSimulator3D
          locale="ru"
          params={params}
          allowMatrixPick
        />
      </div>
    </main>
  );
}
