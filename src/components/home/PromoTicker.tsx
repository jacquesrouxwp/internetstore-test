"use client";

/**
 * A running line between the header and the hero: one current offer.
 * The price is the owner's own (Leonardo DRS IWS at 199 999 грн until the
 * New Year, set 13 October 2026); take the line down when the offer ends.
 */

import { Link } from "@/i18n/routing";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import type { Locale } from "@/types";

const HREF = "/product/leonardo-drs-iws-teploviziynyy-monokuliar";

const TEXT: Record<Locale, { price: string; until: string; more: string }> = {
  uk: { price: "199 999 грн", until: "до Нового року", more: "Тепловізійний монокуляр 640×480 · Детальніше →" },
  ru: { price: "199 999 грн", until: "до Нового года", more: "Тепловизионный монокуляр 640×480 · Подробнее →" },
  en: { price: "199 999 UAH", until: "until New Year", more: "Thermal monocular 640×480 · Learn more →" },
};

export function PromoTicker({ locale }: { locale: Locale }) {
  const t = TEXT[locale] ?? TEXT.uk;
  const items = Array.from({ length: 4 }, (_, i) => i);

  return (
    <Link
      href={HREF}
      aria-label={`Leonardo DRS IWS — ${t.price} ${t.until}. ${t.more}`}
      className="block border-t border-white/10 bg-[var(--accent)]/10 transition hover:bg-[var(--accent)]/15"
    >
      <div
        className="overflow-hidden py-1.5"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
        }}
      >
        <InfiniteSlider direction="horizontal" gap={48} duration={40} durationOnHover={90}>
          {items.map((i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm" aria-hidden={i > 0}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="font-semibold text-primary">
                Leonardo DRS IWS — <span className="text-green-400">{t.price}</span> {t.until}
              </span>
              <span className="text-secondary">{t.more}</span>
            </span>
          ))}
        </InfiniteSlider>
      </div>
    </Link>
  );
}
