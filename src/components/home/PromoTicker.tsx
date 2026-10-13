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

const TEXT: Record<Locale, { offer: string; more: string }> = {
  uk: { offer: "Leonardo DRS IWS — 199 999 грн до Нового року", more: "Тепловізійний монокуляр 640×480 · Детальніше →" },
  ru: { offer: "Leonardo DRS IWS — 199 999 грн до Нового года", more: "Тепловизионный монокуляр 640×480 · Подробнее →" },
  en: { offer: "Leonardo DRS IWS — 199 999 UAH until New Year", more: "Thermal monocular 640×480 · Learn more →" },
};

export function PromoTicker({ locale }: { locale: Locale }) {
  const t = TEXT[locale] ?? TEXT.uk;
  const items = Array.from({ length: 4 }, (_, i) => i);

  return (
    <Link
      href={HREF}
      aria-label={`${t.offer}. ${t.more}`}
      className="block border-b border-white/10 bg-[var(--accent)]/10 transition hover:bg-[var(--accent)]/15"
    >
      <div
        className="overflow-hidden py-2"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
        }}
      >
        <InfiniteSlider direction="horizontal" gap={48} duration={40} durationOnHover={90}>
          {items.map((i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm" aria-hidden={i > 0}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="font-semibold text-primary">{t.offer}</span>
              <span className="text-secondary">{t.more}</span>
            </span>
          ))}
        </InfiniteSlider>
      </div>
    </Link>
  );
}
