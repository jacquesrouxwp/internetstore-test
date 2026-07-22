"use client";

import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars";

/** Isolated demo of the pixel-stars sky background */
export default function StarsDemoPage() {
  return (
    <div
      className="relative h-dvh w-dvw bg-[#05060f]"
      style={{
        backgroundImage:
          "url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIElEQVR42mIUEhJiwAbevXuHVZyJgUQwqmEUDB0AEGAADd8DEPTX6ksAAAAASUVORK5CYII=\")",
        backgroundSize: "10px 10px",
      }}
    >
      <BackgroundPixelStars />
      <div className="relative z-10 flex h-full items-center justify-center px-4 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300/70">
            Pro-Optics
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Pixel Stars Background
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Demo: <code className="text-sky-300">/demo/particle</code>
          </p>
        </div>
      </div>
    </div>
  );
}
