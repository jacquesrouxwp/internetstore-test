"use client";

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
        "group flex w-[9.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10",
        "bg-[var(--surface)] transition hover:border-[var(--accent)]/50 sm:w-[11rem]"
      )}
      title={`${labelPrefix} ${brand.name}`}
    >
      <div className="flex h-[4.5rem] items-center justify-center bg-white px-4 py-3 sm:h-[5.25rem]">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="max-h-10 w-auto max-w-[90%] object-contain transition duration-300 group-hover:scale-105 sm:max-h-12"
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
        className="px-2 py-2 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span className="line-clamp-1 text-[11px] font-medium text-secondary transition group-hover:text-[var(--accent)] sm:text-xs">
          {brand.name}
        </span>
      </div>
    </Link>
  );
}

/**
 * Brand logos as infinite horizontal marquee (pause on hover).
 * Falls back to a static grid if the list is empty.
 */
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

  // Duplicate set for denser track if few brands
  const track = brands.length < 8 ? [...brands, ...brands] : brands;

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
            ? "Официальные бренды тепловизоров — наведите, чтобы замедлить ленту"
            : "Офіційні бренди тепловізорів — наведіть, щоб сповільнити стрічку"}
        </p>
      </div>

      {/* Edge fade masks */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 sm:w-16"
          style={{
            background:
              "linear-gradient(to right, var(--background, #0a0b10), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 sm:w-16"
          style={{
            background:
              "linear-gradient(to left, var(--background, #0a0b10), transparent)",
          }}
        />

        <InfiniteSlider
          gap={14}
          duration={40}
          durationOnHover={80}
          className="py-1"
        >
          {track.map((b, i) => (
            <BrandLogoCard
              key={`${b.id}-${i}`}
              brand={b}
              labelPrefix={labelPrefix}
            />
          ))}
        </InfiniteSlider>

        {/* Second row reverse — richer “marquee” look when enough brands */}
        {brands.length >= 6 && (
          <div className="mt-3">
            <InfiniteSlider
              gap={14}
              duration={48}
              durationOnHover={90}
              reverse
              className="py-1"
            >
              {[...track].reverse().map((b, i) => (
                <BrandLogoCard
                  key={`rev-${b.id}-${i}`}
                  brand={b}
                  labelPrefix={labelPrefix}
                />
              ))}
            </InfiniteSlider>
          </div>
        )}
      </div>
    </section>
  );
}
