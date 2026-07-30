"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ThermalSimulator3D = dynamic(
  () =>
    import("@/components/product/ThermalSimulator3D").then(
      (m) => m.ThermalSimulator3D
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[var(--radius-card)] border border-white/10 bg-[var(--surface)] p-6">
        <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-black/40" />
        <p className="mt-3 text-center text-xs text-faint">3D thermal…</p>
      </div>
    ),
  }
);

export function ThermalSimulator3DLazy(
  props: ComponentProps<typeof ThermalSimulator3D>
) {
  return <ThermalSimulator3D {...props} />;
}
