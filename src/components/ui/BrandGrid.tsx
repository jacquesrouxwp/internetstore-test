"use client";

/**
 * Brand logos — dual-row infinite horizontal marquee (Kaif InfiniteSlider).
 */

import { Link } from "@/i18n/routing";
import type { Brand } from "@/types";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

function BrandLogoCard({
  brand,
  labelPrefix,
}: {
  brand: Brand;
  labelPrefix: string;
}) {
  return (
    <Link
      href={`/catalog/teplovizori?brand=${brand.slug}`}
      className={cn(
        "group flex w-[120px] shrink-0 flex-col overflow-hidden rounded-lg border border-white/10 sm:w-[140px]",
        "bg-[var(--surface)] transition hover:border-[var(--accent)]/55 hover:shadow-[0_0_0_1px_rgba(225,29,42,0.2)]"
      )}
      title={`${labelPrefix} ${brand.name}`}
    >
      <div className="flex aspect-[5/3] items-center justify-center bg-white px-3 py-3">
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
        className="px-2 py-1.5 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span className="line-clamp-1 text-[10px] font-medium text-secondary transition group-hover:text-[var(--accent)] sm:text-[11px]">
          {brand.name}
        </span>
      </div>
    </Link>
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

  // Enough tiles for a smooth loop (slider already duplicates children once)
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
            ? "Официальные бренды — наведите курсор, чтобы замедлить ленту"
            : "Офіційні бренди — наведіть курсор, щоб сповільнити стрічку"}
        </p>
      </div>

      <div className="relative">
        {/* Edge fades */}
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

        {/* Demo-style: two horizontal rows, second reversed */}
        <div className="flex flex-col justify-center gap-3 py-2">
          <InfiniteSlider
            direction="horizontal"
            gap={16}
            duration={35}
            durationOnHover={90}
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
            durationOnHover={95}
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
