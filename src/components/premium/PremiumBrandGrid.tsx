"use client";

import { ChevronDown } from "lucide-react";
import { KIND_LABEL, PREMIUM_BRANDS, type PremiumBrand } from "@/lib/premium-order";
import { PICK_EVENT } from "@/components/premium/PremiumOrderForm";
import type { Locale } from "@/types";

const T = {
  uk: { other: "Іншу модель", order: "Замовити" },
  ru: { other: "Другую модель", order: "Заказать" },
  en: { other: "Another model", order: "Order" },
} as const;

function modelCount(n: number, locale: Locale): string {
  if (locale === "en") return `${n} model${n === 1 ? "" : "s"}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (locale === "ru") return `${n} ${mod10 === 1 && mod100 !== 11 ? "модель" : few ? "модели" : "моделей"}`;
  return `${n} ${mod10 === 1 && mod100 !== 11 ? "модель" : few ? "моделі" : "моделей"}`;
}

function pick(text: string) {
  window.dispatchEvent(new CustomEvent(PICK_EVENT, { detail: text }));
}

function BrandCard({ brand, locale }: { brand: PremiumBrand; locale: Locale }) {
  const t = T[locale];
  const count = brand.models.reduce((n, g) => n + g.items.length, 0);
  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.02] open:border-[var(--accent)]/40 open:bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-semibold text-primary">{brand.name}</span>
          <span className="block text-xs text-muted-ui">
            {brand.country[locale]}
            {count ? ` · ${modelCount(count, locale)}` : ""}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-secondary transition group-open:rotate-180" />
      </summary>

      <div className="border-t border-white/10 px-4 pb-4 pt-3 text-sm">
        <p className="text-secondary">{brand.lines[locale]}</p>
        {brand.models.map((g) => (
          <div key={g.kind} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-ui">{KIND_LABEL[g.kind][locale]}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {g.items.map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => pick(`${brand.short} ${m}`)}
                    title={`${t.order}: ${brand.short} ${m}`}
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-left text-[0.8125rem] text-primary transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {brand.short} {m}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button
          type="button"
          onClick={() => pick(`${brand.short} `)}
          className="mt-3 text-[0.8125rem] font-semibold text-[var(--accent)] hover:underline"
        >
          {t.other} {brand.short} →
        </button>
      </div>
    </details>
  );
}

/**
 * Brands as a compact grid. Each card opens to the maker's best-known models;
 * a click on a model puts it into the order form at the top of the page. The
 * lists stay in the page when a card is closed, so search engines read every
 * model name.
 */
export function PremiumBrandGrid({ locale }: { locale: Locale }) {
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {PREMIUM_BRANDS.map((b) => (
        <BrandCard key={b.name} brand={b} locale={locale} />
      ))}
    </div>
  );
}
