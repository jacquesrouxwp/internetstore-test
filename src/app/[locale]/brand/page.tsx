import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getBrandProductRows, getBrands } from "@/lib/catalog";
import {
  brandDisplayName,
  brandProductPhrase,
  pluralProducts,
  summarizeBrand,
  type Locale,
} from "@/lib/brand-pages";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import { pageAlternates } from "@/lib/seo-alternates";

export const revalidate = 120;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ru = locale === "ru";
  return {
    title: ru
      ? "Бренды тепловизоров и ПНВ: Pulsar, HikMicro, AGM, InfiRay и другие"
      : "Бренди тепловізорів і ПНБ: Pulsar, HikMicro, AGM, InfiRay та інші",
    description: ru
      ? "Все бренды тепловизоров, прицелов и приборов ночного видения в Pro-Optics: Pulsar, HikMicro, AGM, InfiRay, ATN, PARD, Guide, ThermTec. Доставка по Украине, гарантия."
      : "Усі бренди тепловізорів, прицілів і приладів нічного бачення в Pro-Optics: Pulsar, HikMicro, AGM, InfiRay, ATN, PARD, Guide, ThermTec. Доставка по Україні, гарантія.",
    alternates: pageAlternates(locale, "/brand"),
  };
}

export default async function BrandsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const ru = loc === "ru";
  const tn = await getTranslations("nav");
  const [brands, rows] = await Promise.all([getBrands(), getBrandProductRows()]);

  // getBrands() is already in the owner's priority order
  const cards = brands
    .map((b) => ({
      brand: { ...b, name: brandDisplayName(b.slug, b.name) },
      summary: summarizeBrand(rows, b.slug, loc),
    }))
    .filter((c) => c.summary.total > 0);

  const crumbs = [
    { name: tn("home"), path: "/" },
    { name: ru ? "Бренды" : "Бренди", path: "/brand" },
  ];

  return (
    <div className="container-shop py-5 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex flex-wrap items-center gap-2 text-sm text-secondary sm:mb-4"
      >
        <Link href="/" className="hover:text-[var(--accent)]">
          {tn("home")}
        </Link>
        <span className="text-faint">/</span>
        <span className="text-primary">{crumbs[1].name}</span>
      </nav>

      <h1 className="section-title mb-2">
        {ru ? "Бренды тепловизоров и приборов ночного видения" : "Бренди тепловізорів і приладів нічного бачення"}
      </h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-secondary">
        {ru
          ? "Выберите производителя, чтобы увидеть все его модели, цены и наличие. Не знаете, какой бренд подойдёт, — консультант поможет подобрать прибор под ваши задачи."
          : "Оберіть виробника, щоб побачити всі його моделі, ціни й наявність. Не знаєте, який бренд підійде, — консультант допоможе підібрати прилад під ваші задачі."}
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(({ brand, summary }) => (
          <li key={brand.id}>
            <Link
              href={`/brand/${brand.slug}`}
              className="card-surface flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] transition hover:border-[var(--accent)]/50"
            >
              <div className="flex aspect-[5/2] items-center justify-center bg-white px-4">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="max-h-12 w-auto max-w-[85%] object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="font-display text-lg font-semibold text-zinc-800">
                    {brand.name}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-primary">{brand.name}</p>
                <p className="mt-0.5 text-xs text-secondary">
                  {brandProductPhrase(summary, loc)} · {pluralProducts(summary.total, loc)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
