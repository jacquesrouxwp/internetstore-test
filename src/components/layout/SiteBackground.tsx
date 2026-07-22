"use client";

import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars";

/**
 * Full-site night sky: pixel grid + twinkling stars + shooting stars.
 * Sits behind all UI (z-0); content uses relative z-10.
 */
export function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Deep space base + subtle pixel grid (from demo) */}
      <div
        className="absolute inset-0 bg-[#05060f]"
        style={{
          backgroundImage:
            "url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIElEQVR42mIUEhJiwAbevXuHVZyJgUQwqmEUDB0AEGAADd8DEPTX6ksAAAAASUVORK5CYII=\")",
          backgroundSize: "10px 10px",
          opacity: 1,
        }}
      />
      {/* Soft vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(80,120,180,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
      <BackgroundPixelStars />
    </div>
  );
}
