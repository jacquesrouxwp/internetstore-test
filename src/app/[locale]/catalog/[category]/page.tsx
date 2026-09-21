import { CatalogFiltersDrawer } from "@/components/catalog/CatalogFiltersDrawer";
import { CatalogCategoryTabs } from "@/components/catalog/CatalogCategoryTabs";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogProductGrid } from "@/components/catalog/CatalogProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import {
  getBrandProductRows,
  getCatalog,
  getCategories,
  getCategoryBySlug,
} from "@/lib/catalog";
import { Link } from "@/i18n/routing";
import { categoryName, supportsDetectionRangeFilter } from "@/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pageAlternates } from "@/lib/seo-alternates";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import {
  catalogCanonicalPath,
  pageFromQuery,
  singleBrandFacet,
} from "@/lib/pagination";
import { MIN_INDEXABLE_PRODUCTS } from "@/lib/brand-pages";
import { categorySeo } from "@/lib/category-seo";

// searchParams → dynamic render; taxonomy uses unstable_cache (120s).
// Soft product freshness without full force-no-store (was killing catalog speed).
export const revalidate = 30;
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function paramList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const sp = await searchParams;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Catalog" };
  const baseName = categoryName(cat, locale as "uk" | "ru");
  const isRu = locale === "ru";
  const basePath = `/catalog/${category}`;
  const canonicalPath = catalogCanonicalPath(basePath, sp);
  // Deeper pages are now indexable in their own right, so they need distinct
  // titles — identical titles across a sequence get flagged as duplicates.
  const pageNum = canonicalPath === basePath ? 1 : pageFromQuery(sp);
  const name =
    pageNum > 1
      ? `${baseName} — ${isRu ? "страница" : "сторінка"} ${pageNum}`
      : baseName;
  // A bare "Тепловізори" title doesn't match how people search
  // ("тепловізори україна", "тепловизор купить") — say it in the title.
  const title =
    pageNum > 1
      ? name
      : isRu
        ? `${baseName} — купить в Украине, цены`
        : `${baseName} — купити в Україні, ціни`;
  const description =
    (isRu ? cat.descriptionRu : cat.descriptionUk) ||
    (isRu
      ? `${name} — купить в Pro-Optics (Про Оптикс). Консультация, доставка Новой Почтой по Украине, гарантия.`
      : `${name} — купити в Pro-Optics (Про Оптікс). Консультація, доставка Новою Поштою по Україні, гарантія.`);
  const brandCanonical = await brandListingCanonical(category, sp);
  return {
    title,
    description,
    alternates: pageAlternates(locale, brandCanonical ?? canonicalPath),
  };
}

/**
 * `/catalog/pricili?brand=pulsar` lists exactly what `/brand/pulsar/pricili`
 * lists (same query, sort and page size). Old logo/menu links pointed at the
 * facet, so Google holds history for it — hand that to the brand page.
 * Only when the brand page is a real, indexable listing.
 */
async function brandListingCanonical(
  category: string,
  sp: Record<string, string | string[] | undefined>
): Promise<string | null> {
  const brand = singleBrandFacet(sp);
  if (!brand) return null;
  const rows = await getBrandProductRows();
  const count = rows.filter(
    (r) => r.brandSlug === brand && r.categorySlug === category
  ).length;
  if (count < MIN_INDEXABLE_PRODUCTS) return null;
  const page = pageFromQuery(sp);
  return `/brand/${brand}/${category}${page > 1 ? `?page=${page}` : ""}`;
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale, category } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const t = await getTranslations("catalog");
  const tn = await getTranslations("nav");
  const loc = locale as "uk" | "ru";

  const page = Number(sp.page || 1);
  const limit = Number(sp.limit || 12);
  const [result, categories] = await Promise.all([
    getCatalog(
      {
        brands: paramList(sp.brand),
        resolutions: paramList(sp.res),
        deviceType: typeof sp.type === "string" ? sp.type : "all",
        priceMin: sp.min ? Number(sp.min) : undefined,
        priceMax: sp.max ? Number(sp.max) : undefined,
        rangeMin:
          sp.rmin != null && sp.rmin !== "" ? Number(sp.rmin) : undefined,
        rangeMax:
          sp.rmax != null && sp.rmax !== "" ? Number(sp.rmax) : undefined,
        q: typeof sp.q === "string" ? sp.q : undefined,
        sort: typeof sp.sort === "string" ? sp.sort : "default",
        page,
        limit,
      },
      category
    ),
    getCategories(),
  ]);

  const title = categoryName(cat, loc);
  const detectionBounds = supportsDetectionRangeFilter(category)
    ? result.detectionRangeBounds ?? null
    : null;
  const isFirstPage =
    catalogCanonicalPath(`/catalog/${category}`, sp) === `/catalog/${category}`;
  const seo = categorySeo(category, loc);
  const catDescription = loc === "ru" ? cat.descriptionRu : cat.descriptionUk;

  return (
    <div className="container-shop py-5 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd(locale, [
              { name: tn("home"), path: "/" },
              { name: title, path: `/catalog/${category}` },
            ])
          ),
        }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex flex-wrap items-center gap-2 text-sm text-secondary sm:mb-4"
      >
        <Link href="/" className="hover:text-[var(--accent)]">
          {tn("home")}
        </Link>
        <span className="text-faint">/</span>
        <span className="text-primary">{title}</span>
      </nav>

      {/* Switch categories without burger */}
      <CatalogCategoryTabs
        categories={categories}
        currentSlug={category}
        locale={loc}
      />

      <h1 className="section-title mb-4 sm:mb-6">{title}</h1>

      {/*
        Mobile: products first + side filter tab/drawer
        Desktop: classic sidebar filters + grid
      */}
      <Suspense fallback={null}>
        <CatalogFiltersDrawer
          brands={result.brands}
          detectionRangeBounds={detectionBounds}
        >
          <Suspense fallback={null}>
            <CatalogToolbar total={result.total} />
          </Suspense>

          {result.products.length === 0 ? (
            <div className="card-surface py-16 text-center text-secondary">
              {t("empty")}
            </div>
          ) : (
            <CatalogProductGrid products={result.products} />
          )}

          <Pagination
            page={result.page}
            total={result.total}
            limit={result.limit}
            basePath={`/catalog/${category}`}
            query={sp}
          />

          {/* Page 1 only: the same long text on all 37 paginated pages would
              read as duplicate content. */}
          {isFirstPage && (seo || catDescription) && (
            <article
              className="category-seo mt-12 max-w-none pt-8 text-secondary"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <h2 className="font-display text-xl font-semibold text-primary">
                {seo
                  ? seo.title
                  : loc === "ru"
                    ? `${title} — купить в Украине`
                    : `${title} — купити в Україні`}
              </h2>
              {catDescription && (
                <p className="mt-3 text-sm leading-relaxed">{catDescription}</p>
              )}
              {seo && (
                <div
                  className="mt-3 space-y-3 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: seo.html }}
                />
              )}
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
}
