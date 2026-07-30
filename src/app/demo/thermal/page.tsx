"use client";

import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThermalSimulator } from "@/components/product/ThermalSimulator";
import type { ThermalMatrix, ThermalSimParams } from "@/lib/thermal/parse-product-thermal";
import {
  defaultDetectionRangeM,
  defaultNetdMk,
} from "@/lib/thermal/parse-product-thermal";
import ruMessages from "../../../../messages/ru.json";

/**
 * Standalone preview harness for the thermal simulator.
 * Visit /demo/thermal — includes intl provider for score HUD labels.
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

  // Demo score specs so dual-compare + HUD work without catalog
  const scoreSpecs = {
    hPixels: matrix,
    vPixels: matrix >= 640 ? 512 : matrix >= 384 ? 288 : 192,
    pixelPitchUm: 12,
    netdMk: defaultNetdMk(matrix),
    refreshHz: 50,
    detectionRangeM: defaultDetectionRangeM(matrix),
    priceEur: matrix >= 640 ? 1400 : matrix >= 384 ? 900 : 450,
  };

  return (
    <NextIntlClientProvider locale="ru" messages={ruMessages}>
      <main className="min-h-screen bg-[#0a0b10] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-2 text-2xl font-bold">
            Thermal Simulator — dual A/B preview
          </h1>
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
          <ThermalSimulator
            locale="ru"
            params={params}
            allowMatrixPick
            scoreSpecs={scoreSpecs}
            scoreProductName={`Demo ${matrix}`}
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
              },
            ]}
          />
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
