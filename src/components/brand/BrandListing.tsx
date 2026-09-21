import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CatalogFiltersDrawer } from "@/components/catalog/CatalogFiltersDrawer";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogProductGrid } from "@/components/catalog/CatalogProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { getCatalog, getCategories } from "@/lib/catalog";
import type { Brand } from "@/types";
import { categoryName, supportsDetectionRangeFilter } from "@/types";
import { breadcrumbJsonLd, jsonLdScript, type Crumb } from "@/lib/breadcrumbs";
import { catalogCanonicalPath, catalogFiltersFromQuery } from "@/lib/pagination";
import {
  brandFaq,
  brandPageTitle,
  capitalize,
  categoryWords,
  formatUah,
  pluralProducts,
  summarizeBrand,
  type BrandProductRow,
  type Locale,
} from "@/lib/brand-pages";
import { brandIntro } from "@/lib/brand-seo-copy";
import { serviceBlockHtml } from "@/lib/category-seo";
import { cn } from "@/lib/utils";

type Query = Record<string, string | string[] | undefined>;

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition whitespace-nowrap";

/**
 * Shared body of /brand/[slug] and /brand/[slug]/[category]: breadcrumbs,
 * H1, brand category chips, the filterable product grid and — on page 1 —
 * the brand copy built from live catalog numbers.
 */
export async function BrandListing({
  locale,
  brand,
  rows,
  categorySlug,
  query,
}: {
  locale: Locale;
  brand: Brand;
  rows: BrandProductRow[];
  categorySlug?: string;
  query: Query;
}) {
  const ru = locale === "ru";
  const tn = await getTranslations("nav");
  const basePath = categorySlug
    ? `/brand/${brand.slug}/${categorySlug}`
    : `/brand/${brand.slug}`;
  const filters = catalogFiltersFromQuery(query);

  const [result, categories] = await Promise.all([
    getCatalog({ ...filters, brands: [brand.slug] }, categorySlug),
    getCategories(),
  ]);
  const catNames: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.slug, categoryName(c, locale)])
  );
  const words = (slug: string) => categoryWords(slug, locale, catNames[slug]);

  const brandSummary = summarizeBrand(rows, brand.slug, locale);
  const summary = categorySlug
    ? summarizeBrand(rows, brand.slug, locale, categorySlug)
    : brandSummary;
  const { h1 } = brandPageTitle(brand.name, brandSummary, locale, {
    categorySlug,
    categoryName: categorySlug ? catNames[categorySlug] : undefined,
  });

  const brandsLabel = ru ? "Бренды" : "Бренди";
  const crumbs: Crumb[] = [
    { name: tn("home"), path: "/" },
    { name: brandsLabel, path: "/brand" },
    { name: brand.name, path: `/brand/${brand.slug}` },
    ...(categorySlug
      ? [{ name: capitalize(words(categorySlug).full), path: basePath }]
      : []),
  ];

  const isFirstPage = catalogCanonicalPath(basePath, query) === basePath;
  const detectionBounds =
    categorySlug && supportsDetectionRangeFilter(categorySlug)
      ? result.detectionRangeBounds ?? null
      : null;

  const stats = [
    pluralProducts(summary.total, locale),
    summary.minPrice
      ? `${ru ? "от" : "від"} ${formatUah(summary.minPrice.price)}`
      : null,
  ].filter(Boolean);

  return (
    <div className="container-shop py-5 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)),
        }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex flex-wrap items-center gap-2 text-sm text-secondary sm:mb-4"
      >
        {crumbs.map((c, i) =>
          i < crumbs.length - 1 ? (
            <span key={c.path} className="flex items-center gap-2">
              <Link href={c.path} className="hover:text-[var(--accent)]">
                {c.name}
              </Link>
              <span className="text-faint">/</span>
            </span>
          ) : (
            <span key={c.path} className="text-primary">
              {c.name}
            </span>
          )
        )}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-4 sm:mb-5">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="h-12 w-20 shrink-0 rounded-lg bg-white object-contain p-1.5"
          />
        ) : null}
        <div>
          <h1 className="section-title">{h1}</h1>
          <p className="mt-1 text-sm text-secondary">{stats.join(" · ")}</p>
        </div>
      </div>

      {brandSummary.byCategory.length > 1 && (
        <nav
          aria-label={ru ? "Категории бренда" : "Категорії бренду"}
          className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Link
            href={`/brand/${brand.slug}`}
            className={cn(
              CHIP,
              !categorySlug
                ? "border-[var(--accent)] bg-[rgba(225,29,42,0.16)] text-primary"
                : "border-white/10 text-secondary hover:border-white/25 hover:text-primary"
            )}
          >
            {ru ? "Все товары" : "Усі товари"}
            <span className="text-xs text-muted-ui">{brandSummary.total}</span>
          </Link>
          {brandSummary.byCategory.map((c) => (
            <Link
              key={c.slug}
              href={`/brand/${brand.slug}/${c.slug}`}
              className={cn(
                CHIP,
                c.slug === categorySlug
                  ? "border-[var(--accent)] bg-[rgba(225,29,42,0.16)] text-primary"
                  : "border-white/10 text-secondary hover:border-white/25 hover:text-primary"
              )}
            >
              {capitalize(words(c.slug).short)}
              <span className="text-xs text-muted-ui">{c.count}</span>
            </Link>
          ))}
        </nav>
      )}

      <Suspense fallback={null}>
        <CatalogFiltersDrawer brands={[]} detectionRangeBounds={detectionBounds}>
          <Suspense fallback={null}>
            <CatalogToolbar total={result.total} />
          </Suspense>

          {result.products.length === 0 ? (
            <div className="card-surface py-16 text-center text-secondary">
              {brandSummary.total === 0
                ? ru
                  ? `Сейчас товаров ${brand.name} нет в каталоге — позвоните, подскажем аналог.`
                  : `Зараз товарів ${brand.name} немає в каталозі — зателефонуйте, підкажемо аналог.`
                : ru
                  ? "По этим фильтрам ничего не найдено."
                  : "За цими фільтрами нічого не знайдено."}
            </div>
          ) : (
            <CatalogProductGrid products={result.products} />
          )}

          <Pagination
            page={result.page}
            total={result.total}
            limit={result.limit}
            basePath={basePath}
            query={query}
          />

          {isFirstPage && summary.total > 0 && (
            <article
              className="category-seo mt-12 max-w-none pt-8 text-secondary"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <h2 className="font-display text-xl font-semibold text-primary">
                {`${categorySlug ? h1 : brand.name} ${ru ? "в" : "у"} Pro-Optics`}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed">
                {!categorySlug && brandIntro(brand.slug, locale) ? (
                  <p>{brandIntro(brand.slug, locale)}</p>
                ) : null}
                <p>
                  {categorySlug
                    ? overviewCategory()
                    : overviewBrand()}
                </p>

                {summary.lines.length > 0 && (
                  <>
                    <h3>{ru ? `Серии ${brand.name}` : `Серії ${brand.name}`}</h3>
                    <ul>
                      {summary.lines.slice(0, 12).map((l) => (
                        <li key={l.name}>
                          <Link
                            href={`/search?q=${encodeURIComponent(`${brand.name} ${l.name}`)}`}
                          >
                            {brand.name} {l.name}
                          </Link>
                          {!categorySlug && l.categorySlug
                            ? ` — ${words(l.categorySlug).short}`
                            : ""}
                          {` (${pluralProducts(l.count, locale)})`}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <h3>{ru ? "Вопросы и ответы" : "Питання та відповіді"}</h3>
                {brandFaq(
                  brand.name,
                  summary,
                  locale,
                  categorySlug ? words(categorySlug).full : undefined
                ).map((f) => (
                  <div key={f.q}>
                    <p>
                      <strong>{f.q}</strong>
                    </p>
                    <p>{f.a}</p>
                  </div>
                ))}

                <div dangerouslySetInnerHTML={{ __html: serviceBlockHtml(locale) }} />
              </div>
            </article>
          )}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .category-seo h3 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-top: 1.25rem; }
            .category-seo ul { list-style: disc; margin-left: 1.25rem; }
            .category-seo li { margin-bottom: 0.35rem; }
            .category-seo a { color: var(--accent); text-decoration: underline; }
            .category-seo strong { color: var(--text-primary); }
          `,
            }}
          />
        </CatalogFiltersDrawer>
      </Suspense>
    </div>
  );

  function priceRange(): string {
    if (!summary.minPrice || !summary.maxPrice) return "";
    if (summary.minPrice.price === summary.maxPrice.price)
      return formatUah(summary.minPrice.price);
    return ru
      ? `от ${formatUah(summary.minPrice.price)} до ${formatUah(summary.maxPrice.price)}`
      : `від ${formatUah(summary.minPrice.price)} до ${formatUah(summary.maxPrice.price)}`;
  }

  function cheapestLink(): ReactNode {
    if (!summary.minPrice) return null;
    return (
      <>
        {ru ? " Самая доступная модель — " : " Найдоступніша модель — "}
        <Link href={`/product/${summary.minPrice.slug}`}>{summary.minPrice.name}</Link>.
      </>
    );
  }

  function overviewBrand(): ReactNode {
    const cats = brandSummary.byCategory;
    return (
      <>
        {ru
          ? `В каталоге Pro-Optics — ${pluralProducts(summary.total, locale)} ${brand.name}: `
          : `У каталозі Pro-Optics — ${pluralProducts(summary.total, locale)} ${brand.name}: `}
        {cats.map((c, i) => (
          <span key={c.slug}>
            {i > 0 ? ", " : ""}
            <Link href={`/brand/${brand.slug}/${c.slug}`}>{words(c.slug).full}</Link>
            {` (${c.count})`}
          </span>
        ))}
        {". "}
        {priceRange()
          ? ru
            ? `Цены на приборы — ${priceRange()}.`
            : `Ціни на прилади — ${priceRange()}.`
          : null}
        {cheapestLink()}
      </>
    );
  }

  function overviewCategory(): ReactNode {
    const cat = categorySlug!;
    return (
      <>
        {ru
          ? `В разделе — ${pluralProducts(summary.total, locale)}`
          : `У розділі — ${pluralProducts(summary.total, locale)}`}
        {priceRange()
          ? ru
            ? `, цены ${priceRange()}.`
            : `, ціни ${priceRange()}.`
          : "."}
        {cheapestLink()}
        {ru ? " Смотрите также " : " Дивіться також "}
        <Link href={`/brand/${brand.slug}`}>
          {ru ? `все товары ${brand.name}` : `усі товари ${brand.name}`}
        </Link>
        {ru ? " и " : " та "}
        <Link href={`/catalog/${cat}`}>
          {ru ? `все ${words(cat).full}` : `усі ${words(cat).full}`}
        </Link>
        .
      </>
    );
  }
}
