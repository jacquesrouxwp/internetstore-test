"use client";

/**
 * PDP image gallery — main photo + clickable thumbs + prev/next.
 */

import { useCallback, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  alt: string;
  /** Badges overlaid on the main frame (sale / hit / new) */
  badges?: ReactNode;
  /** Max thumbs shown (rest still reachable via arrows) */
  maxThumbs?: number;
};

export function ProductImageGallery({
  images,
  alt,
  badges,
  maxThumbs = 8,
}: Props) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const total = list.length;
  const active = total > 0 ? Math.min(index, total - 1) : 0;
  const src = total > 0 ? list[active] : null;
  const multi = total > 1;

  const go = useCallback(
    (i: number) => {
      if (total === 0) return;
      setIndex(((i % total) + total) % total);
    },
    [total]
  );

  const prev = useCallback(() => go(active - 1), [go, active]);
  const next = useCallback(() => go(active + 1), [go, active]);

  const thumbs = list.slice(0, maxThumbs);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={alt}
            className="h-full w-full object-contain p-8"
            fetchPriority={active === 0 ? "high" : "auto"}
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-canvas">
            <div className="h-32 w-40 rounded-[2rem] bg-gradient-to-br from-zinc-500 to-zinc-800 shadow-lg">
              <div className="mx-auto mt-10 h-14 w-14 rounded-full border-2 border-white/80" />
            </div>
          </div>
        )}

        {badges ? (
          <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5">
            {badges}
          </div>
        ) : null}

        {multi && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className={cn(
                "absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center",
                "rounded-full border border-black/10 bg-white/90 text-zinc-800 shadow-md",
                "transition hover:bg-white active:scale-95 sm:left-3"
              )}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className={cn(
                "absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center",
                "rounded-full border border-black/10 bg-white/90 text-zinc-800 shadow-md",
                "transition hover:bg-white active:scale-95 sm:right-3"
              )}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {multi && (
        <div
          className={cn(
            "mt-3 grid gap-2",
            thumbs.length <= 4
              ? "grid-cols-4"
              : thumbs.length <= 5
                ? "grid-cols-5"
                : "grid-cols-4 sm:grid-cols-6"
          )}
        >
          {thumbs.map((thumb, i) => {
            const selected = i === active;
            return (
              <button
                key={`${thumb}-${i}`}
                type="button"
                onClick={() => go(i)}
                aria-label={`Photo ${i + 1}`}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "aspect-square overflow-hidden rounded-lg border bg-white p-1.5 transition",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                  selected
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/35"
                    : "border-line opacity-85 hover:border-[var(--accent)]/50 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
