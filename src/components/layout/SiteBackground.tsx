"use client";

import { StarsBackground } from "@/components/ui/stars";

/**
 * Full-site stars background (parallax + drifting layers).
 * Fixed behind all UI (z-0); content uses relative z-10.
 * globalMouse = parallax without blocking clicks.
 */
export function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <StarsBackground
        className="h-full w-full"
        factor={0.04}
        speed={55}
        starColor="#e8eef8"
        globalMouse
      />
      {/* Soft vignette — keeps product cards readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
