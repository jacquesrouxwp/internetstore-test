"use client";

import { useState } from "react";
import { ThermalSimulator } from "@/components/product/ThermalSimulator";
import type {
  ThermalMatrix,
  ThermalSimParams,
} from "@/lib/thermal/parse-product-thermal";
import {
  defaultDetectionRangeM,
  defaultNetdMk,
  defaultPriceUah,
  matrixClassPreset,
} from "@/lib/thermal/parse-product-thermal";

/**
 * Standalone preview harness for the dual A/B thermal simulator.
 * Visit /demo/thermal
 */
export default function ThermalDemoPage() {
  const [matrix, setMatrix] = useState<ThermalMatrix>(640);
  const preset = matrixClassPreset(matrix);
  const params: ThermalSimParams = {
    ...preset,
    label: `Demo ${matrix}`,
  };

  return (
    <main className="min-h-screen bg-[#0a0b10] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-bold">
          Thermal Simulator — dual A/B preview
        </h1>
        <p className="mb-4 text-sm text-white/50">
          Backup A/B UI · ground-plane deer (HORIZON 0.73, no tree float)
        </p>
        <div className="mb-6 flex gap-2">
          {([256, 384, 640] as ThermalMatrix[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMatrix(m)}
              className={`rounded px-3 py-1.5 text-sm ${
                matrix === m ? "bg-red-600" : "bg-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <ThermalSimulator
          locale="ru"
          params={params}
          compareOptions={[
            {
              id: "demo-256",
              slug: "demo-256",
              name: "Demo Budget 256×192",
              matrix: 256,
              detectionRangeM: defaultDetectionRangeM(256),
              netdMk: defaultNetdMk(256),
              refreshRateHz: 25,
              focalMm: 19,
              pitchUm: 12,
              priceUah: defaultPriceUah(256),
            },
            {
              id: "demo-384",
              slug: "demo-384",
              name: "Demo Mid 384×288",
              matrix: 384,
              detectionRangeM: defaultDetectionRangeM(384),
              netdMk: defaultNetdMk(384),
              refreshRateHz: 50,
              focalMm: 25,
              pitchUm: 12,
              priceUah: defaultPriceUah(384),
            },
            {
              id: "demo-640",
              slug: "demo-640",
              name: "Demo Pro 640×512",
              matrix: 640,
              detectionRangeM: defaultDetectionRangeM(640),
              netdMk: defaultNetdMk(640),
              refreshRateHz: 50,
              focalMm: 35,
              pitchUm: 12,
              priceUah: defaultPriceUah(640),
            },
          ]}
        />
      </div>
    </main>
  );
}
