"use client";

import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars";

/**
 * Full-site night sky — intentionally muted so glass cards / UI pop on top.
 */
export function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[#070910]" />
      {/* Soft pixel grid — low contrast */}
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIElEQVR42mIUEhJiwAbevXuHVZyJgUQwqmEUDB0AEGAADd8DEPTX6ksAAAAASUVORK5CYII=\")",
          backgroundSize: "12px 12px",
        }}
      />
      {/* Cool haze — very subtle, not bright */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(70,100,150,0.07),transparent_50%)]" />
      {/* Stronger center/edge darkening so content zone is calmer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba_25%,rgba(0,0,0,0.55)_100%)]" />
      <BackgroundPixelStars />
      {/* Final soft veil — unifies stars, lifts UI contrast without killing the sky */}
      <div className="absolute inset-0 bg-[#05060f]/35" />
    </div>
  );
}
