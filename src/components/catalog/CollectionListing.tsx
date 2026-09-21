import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CatalogFiltersDrawer } from "@/components/catalog/CatalogFiltersDrawer";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogProductGrid } from "@/components/catalog/CatalogProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { getCatalog } from "@/lib/catalog";
import type { Category } from "@/types";
import { categoryName, supportsDetectionRangeFilter } from "@/types";
import { breadcrumbJsonLd, jsonLdScript, type Crumb } from "@/lib/breadcrumbs";
import { catalogCanonicalPath, catalogFiltersFromQuery } from "@/lib/pagination";
import {
  MIN_INDEXABLE_PRODUCTS,
  brandDisplayName,
  formatUah,
  pluralProducts,
  type BrandProductRow,
  type Locale,
} from "@/lib/brand-pages";
import {
  collectionsFor,
  summarizeCollection,
  type Collection,
} from "@/lib/collections";
import { serviceBlockHtml } from "@/lib/category-seo";
import { cn } from "@/lib/utils";

type Query = Record<string, string | string[] | undefined>;

const CHIP =
  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition whitespace-nowrap";

/**
 * /catalog/<category>/<collection>: the category listing with the
 * collection's filter locked in, plus copy built from the matching rows.
 */
export async function CollectionListing({
  locale,
  category,
  collection,
  rows,
  query,
}: {
  locale: Locale;
  category: Category;
  collection: Collection;
  rows: BrandProductRow[];
  query: Query;
}) {
  const ru = locale === "ru";
  const tn = await getTranslations("nav");
  const catPath = `/catalog/${category.slug}`;
  const basePath = `${catPath}/${collection.slug}`;
  const user = catalogFiltersFromQuery(query);
  const f = collection.filter;

  // The collection's own filter wins; visitors can narrow within it.
  const result = await getCatalog(
    {
      ...user,
      resolutions: f.resolution ? [f.resolution] : user.resolutions,
      priceMax:
        f.priceMax != null
          ? Math.min(f.priceMax, user.priceMax ?? f.priceMax)
          : user.priceMax,
      q: f.q ? [f.q, user.q].filter(Boolean).join(" ") : user.q,
    },
    category.slug
  );

  const summary = summarizeCollection(rows, collection, locale, brandDisplayName);
  const catLabel = categoryName(category, locale);
  const h1 = collection.h1[locale];
  const crumbs: Crumb[] = [
    { name: tn("home"), path: "/" },
    { name: catLabel, path: catPath },
    { name: h1, path: basePath },
  ];
  const isFirstPage = catalogCanonicalPath(basePath, query) === basePath;

  // Brand links go to the brand × category page when it is a real listing.
  const brandCatCount = (slug: string) =>
    rows.filter((r) => r.brandSlug === slug && r.categorySlug === category.slug).length;
  const brandHref = (slug: string) =>
    brandCatCount(slug) >= MIN_INDEXABLE_PRODUCTS
      ? `/brand/${slug}/${category.slug}`
      : `/brand/${slug}`;

  const priceRange =
    summary.minPrice && summary.maxPrice
      ? summary.minPrice.price === summary.maxPrice.price
        ? formatUah(summary.minPrice.price)
        : ru
          ? `от ${formatUah(summary.minPrice.price)} до ${formatUah(summary.maxPrice.price)}`
          : `від ${formatUah(summary.minPrice.price)} до ${formatUah(summary.maxPrice.price)}`
      : "";

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

      <h1 className="section-title">{h1}</h1>
      <p className="mb-4 mt-1 text-sm text-secondary sm:mb-5">
        {[
          pluralProducts(summary.total, locale),
          summary.minPrice ? `${ru ? "от" : "від"} ${formatUah(summary.minPrice.price)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <nav
        aria-label={ru ? "Подборки" : "Підбірки"}
        className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Link
          href={catPath}
          className={cn(CHIP, "border-white/10 text-secondary hover:border-white/25 hover:text-primary")}
        >
          {ru ? `Все ${catLabel.toLowerCase()}` : `Усі ${catLabel.toLowerCase()}`}
        </Link>
        {collectionsFor(category.slug).map((c) => (
          <Link
            key={c.slug}
            href={`${catPath}/${c.slug}`}
            className={cn(
              CHIP,
              c.slug === collection.slug
                ? "border-[var(--accent)] bg-[rgba(225,29,42,0.16)] text-primary"
                : "border-white/10 text-secondary hover:border-white/25 hover:text-primary"
            )}
          >
            {c.chip[locale]}
          </Link>
        ))}
      </nav>

      <Suspense fallback={null}>
        <CatalogFiltersDrawer
          brands={result.brands}
          detectionRangeBounds={
            supportsDetectionRangeFilter(category.slug) ? result.detectionRangeBounds ?? null : null
          }
        >
          <Suspense fallback={null}>
            <CatalogToolbar total={result.total} />
          </Suspense>

          {result.products.length === 0 ? (
            <div className="card-surface py-16 text-center text-secondary">
              {ru ? "По этим фильтрам ничего не найдено." : "За цими фільтрами нічого не знайдено."}
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
                {`${h1} ${ru ? "в" : "у"} Pro-Optics`}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed">
                <p>{collection.intro[locale]}</p>
                <p>
                  {ru
                    ? `В подборке — ${pluralProducts(summary.total, locale)}`
                    : `У підбірці — ${pluralProducts(summary.total, locale)}`}
                  {priceRange ? (ru ? `, цены ${priceRange}.` : `, ціни ${priceRange}.`) : "."}
                  {summary.minPrice ? (
                    <>
                      {ru ? " Самая доступная модель — " : " Найдоступніша модель — "}
                      <Link href={`/product/${summary.minPrice.slug}`}>{summary.minPrice.name}</Link>.
                    </>
                  ) : null}
                </p>

                {summary.brands.length > 0 && (
                  <>
                    <h3>{ru ? "Бренды в подборке" : "Бренди в підбірці"}</h3>
                    <p>
                      {summary.brands.slice(0, 10).map((b, i) => (
                        <span key={b.slug}>
                          {i > 0 ? ", " : ""}
                          <Link href={brandHref(b.slug)}>{b.name}</Link>
                          {` (${b.count})`}
                        </span>
                      ))}
                      .
                    </p>
                  </>
                )}

                <h3>{ru ? "Вопросы и ответы" : "Питання та відповіді"}</h3>
                {priceRange ? (
                  <div>
                    <p>
                      <strong>
                        {ru
                          ? `Сколько стоят ${h1.charAt(0).toLowerCase()}${h1.slice(1)}?`
                          : `Скільки коштують ${h1.charAt(0).toLowerCase()}${h1.slice(1)}?`}
                      </strong>
                    </p>
                    <p>
                      {ru
                        ? `В каталоге Pro-Optics — ${priceRange}. Точную цену и наличие смотрите в карточке модели.`
                        : `У каталозі Pro-Optics — ${priceRange}. Точну ціну й наявність дивіться в картці моделі.`}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p>
                    <strong>{ru ? "Как выбрать модель?" : "Як обрати модель?"}</strong>
                  </p>
                  <p>
                    {ru ? "Сравните матрицы и объективы в " : "Порівняйте матриці й об'єктиви в "}
                    <Link href="/simulator">{ru ? "симуляторе тепловизора" : "симуляторі тепловізора"}</Link>
                    {ru
                      ? " или позвоните консультанту — подберём прибор под ваши дистанции."
                      : " або зателефонуйте консультанту — підберемо прилад під ваші дистанції."}
                  </p>
                </div>

                <div dangerouslySetInnerHTML={{ __html: serviceBlockHtml(locale) }} />
              </div>
            </article>
          )}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .category-seo h3 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-top: 1.25rem; }
            .category-seo a { color: var(--accent); text-decoration: underline; }
            .category-seo strong { color: var(--text-primary); }
          `,
            }}
          />
        </CatalogFiltersDrawer>
      </Suspense>
    </div>
  );
}
