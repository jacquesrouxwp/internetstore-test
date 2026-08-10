"use client";

/**
 * Compact brand ticker for the left hero card.
 * Click → catalog filtered by brand.
 */

import type { Brand } from "@/types";
import { Link } from "@/i18n/routing";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type Props = {
  brands: Brand[];
  title?: string;
  className?: string;
};

function BrandChip({ brand }: { brand: Brand }) {
  const href = `/catalog/teplovizori?brand=${encodeURIComponent(brand.slug)}`;
  return (
    <Link
      href={href}
      className={cn(
        "group flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5",
        "sm:gap-2 sm:rounded-xl sm:px-2.5 sm:py-1.5",
        "transition hover:border-[var(--accent)]/45 hover:bg-white/[0.07]"
      )}
      title={brand.name}
    >
      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded bg-white px-0.5 sm:h-8 sm:w-8 sm:rounded-lg sm:px-1">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            className="max-h-3.5 w-auto max-w-full object-contain sm:max-h-5"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="text-[7px] font-bold text-zinc-800 sm:text-[9px]">
            {brand.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="max-w-[4.5rem] truncate whitespace-nowrap text-[10px] font-semibold tracking-tight text-primary group-hover:text-white sm:max-w-none sm:text-xs sm:text-sm">
        {brand.name}
      </span>
    </Link>
  );
}

export function HeroBrandMarquee({ brands, title, className }: Props) {
  if (!brands.length) return null;

  const track =
    brands.length < 6
      ? [...brands, ...brands, ...brands]
      : [...brands, ...brands];

  return (
    <div className={cn("min-w-0", className)}>
      {title && (
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ui sm:mb-2.5 sm:text-[11px] sm:tracking-[0.14em]">
          {title}
        </p>
      )}
      <div
        className="relative -mx-1 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      >
        {/* duration ↑ = slower scroll */}
        <InfiniteSlider
          direction="horizontal"
          gap={8}
          duration={75}
          durationOnHover={160}
          className="px-1"
        >
          {track.map((b, i) => (
            <BrandChip key={`${b.id}-${i}`} brand={b} />
          ))}
        </InfiniteSlider>
      </div>
    </div>
  );
}
