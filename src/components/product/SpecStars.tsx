import { Star } from "lucide-react";
import { specRatings } from "@/lib/product-ratings";
import type { Locale, Product } from "@/types";

const MAX_STARS = 5;

function StarRow({ stars, label }: { stars: number; label: string }) {
  return (
    <span className="flex shrink-0 gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={
            i < stars
              ? "h-[15px] w-[15px] fill-amber-400 text-amber-400"
              : "h-[15px] w-[15px] fill-white/[0.06] text-white/20"
          }
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/**
 * "What this device is good at" — stars derived from the spec sheet, never
 * from reviews. See lib/product-ratings for the scale and why it is fixed.
 */
export function SpecStars({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const ratings = specRatings(product, locale);
  if (ratings.length < 3) return null; // too thin to be worth a block

  const ru = locale === "ru";

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <h2 className="mb-2.5 text-sm font-semibold text-primary">
        {ru ? "Сильные стороны прибора" : "Сильні сторони приладу"}
      </h2>
      <ul className="grid gap-1.5">
        {ratings.map((r) => (
          <li
            key={r.key}
            className="flex items-center gap-3 text-sm"
            title={`${r.label}: ${r.value} — ${r.hint}`}
          >
            <span className="w-28 shrink-0 text-secondary">{r.label}</span>
            <StarRow stars={r.stars} label={`${r.stars} / ${MAX_STARS}`} />
            <span className="ml-auto text-right font-medium text-primary">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs leading-relaxed text-muted-ui">
        {ru
          ? "Звёзды рассчитаны из паспортных характеристик по единой шкале для всего каталога. Это не отзывы покупателей."
          : "Зірки розраховані з паспортних характеристик за єдиною шкалою для всього каталогу. Це не відгуки покупців."}
      </p>
    </section>
  );
}
