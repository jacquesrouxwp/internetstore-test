"use client";

import { GradientDots } from "@/components/ui/gradient-dots";

/**
 * Full-site animated gradient-dots background.
 * Fixed behind all UI (z-0); content uses relative z-10.
 */
export function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <GradientDots
        duration={28}
        colorCycleDuration={10}
        dotSize={8}
        spacing={10}
        backgroundColor="var(--background)"
        className="opacity-90"
      />
      {/* Soft vignette so product panels stay readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
