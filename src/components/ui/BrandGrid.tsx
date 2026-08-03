"use client";

/**
 * Brand logos — dual-row infinite marquee.
 * One tap/click → catalog filtered by that brand (no double-tap).
 */

import { useRouter } from "@/i18n/routing";
import type { Brand } from "@/types";
import { useLocale } from "next-intl";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

function BrandLogoCard({
  brand,
  labelPrefix,
}: {
  brand: Brand;
  labelPrefix: string;
}) {
  const router = useRouter();
  const href = `/catalog/teplovizori?brand=${encodeURIComponent(brand.slug)}`;
  /** Ignore click if finger moved (user was scrolling the page / marquee drag) */
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(() => {
    router.push(href);
  }, [router, href]);

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const onClick = (e: React.MouseEvent) => {
    // Always single-click navigation (works inside animated marquee)
    e.preventDefault();
    e.stopPropagation();
    if (startRef.current) {
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      // If moved more than ~12px, treat as scroll/drag — don't navigate
      if (dx > 12 || dy > 12) {
        startRef.current = null;
        return;
      }
    }
    startRef.current = null;
    go();
  };

  return (
    <a
      href={href}
      role="link"
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        "group relative z-20 flex w-[120px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-white/10 sm:w-[140px]",
        "bg-[var(--surface)] transition hover:border-[var(--accent)]/55 hover:shadow-[0_0_0_1px_rgba(225,29,42,0.2)]",
        "touch-manipulation select-none active:scale-[0.98]"
      )}
      title={`${labelPrefix} ${brand.name}`}
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
    >
      <div className="pointer-events-none flex aspect-[5/3] items-center justify-center bg-white px-3 py-3">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="max-h-10 w-auto max-w-[90%] object-contain transition duration-300 group-hover:scale-105 sm:max-h-11"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="font-display text-sm font-semibold tracking-tight text-zinc-800">
            {brand.name}
          </span>
        )}
      </div>
      <div
        className="pointer-events-none px-2 py-1.5 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span className="line-clamp-1 text-[10px] font-medium text-secondary transition group-hover:text-[var(--accent)] sm:text-[11px]">
          {brand.name}
        </span>
      </div>
    </a>
  );
}

export function BrandGrid({
  brands,
  title,
  className,
}: {
  brands: Brand[];
  title?: string;
  className?: string;
}) {
  const locale = useLocale();
  const labelPrefix = locale === "ru" ? "Тепловизоры" : "Тепловізори";

  if (!brands.length) return null;

  const track =
    brands.length < 6 ? [...brands, ...brands, ...brands] : brands;

  return (
    <section
      className={cn("py-12", className)}
      style={{ borderTop: "1px solid var(--border)" }}
      aria-label={title || labelPrefix}
    >
      <div className="container-shop mb-6">
        {title && <h2 className="section-title">{title}</h2>}
        <p className="mt-1 text-sm text-secondary">
          {locale === "ru"
            ? "Нажмите на бренд — сразу откроется каталог с его товарами"
            : "Натисніть на бренд — одразу відкриється каталог з його товарами"}
        </p>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-14"
          style={{
            background:
              "linear-gradient(to right, var(--background), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-14"
          style={{
            background:
              "linear-gradient(to left, var(--background), transparent)",
          }}
        />

        <div className="flex flex-col justify-center gap-3 py-2">
          <InfiniteSlider
            direction="horizontal"
            gap={16}
            duration={35}
            durationOnHover={120}
          >
            {track.map((b, i) => (
              <BrandLogoCard
                key={`r1-${b.id}-${i}`}
                brand={b}
                labelPrefix={labelPrefix}
              />
            ))}
          </InfiniteSlider>

          <InfiniteSlider
            direction="horizontal"
            reverse
            gap={16}
            duration={40}
            durationOnHover={120}
          >
            {track.map((b, i) => (
              <BrandLogoCard
                key={`r2-${b.id}-${i}`}
                brand={b}
                labelPrefix={labelPrefix}
              />
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
}
