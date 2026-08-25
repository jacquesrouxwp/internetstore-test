import { CatalogFiltersDrawer } from "@/components/catalog/CatalogFiltersDrawer";
import { CatalogCategoryTabs } from "@/components/catalog/CatalogCategoryTabs";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogProductGrid } from "@/components/catalog/CatalogProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { getCatalog, getCategories } from "@/lib/catalog";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Suspense } from "react";

export const revalidate = 30;
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
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
  const { locale } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const isRu = locale === "ru";
  const title = q
    ? isRu
      ? `Поиск: ${q}`
      : `Пошук: ${q}`
    : isRu
      ? "Поиск по каталогу"
      : "Пошук по каталогу";
  return {
    title,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("catalog");
  const tn = await getTranslations("nav");
  const loc = locale as "uk" | "ru";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const page = Number(sp.page || 1);
  const limit = Number(sp.limit || 24);

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
        q: q || undefined,
        sort: typeof sp.sort === "string" ? sp.sort : "default",
        page,
        limit,
      }
      // no categorySlug → global search across all categories
    ),
    getCategories(),
  ]);

  const heading = q
    ? loc === "ru"
      ? `Результаты: «${q}»`
      : `Результати: «${q}»`
    : loc === "ru"
      ? "Поиск по каталогу"
      : "Пошук по каталогу";

  return (
    <div className="container-shop py-5 sm:py-8">
      <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm text-secondary sm:mb-4">
        <Link href="/" className="hover:text-[var(--accent)]">
          {tn("home")}
        </Link>
        <span className="text-faint">/</span>
        <span className="text-primary">
          {loc === "ru" ? "Поиск" : "Пошук"}
        </span>
      </nav>

      <CatalogCategoryTabs
        categories={categories}
        currentSlug=""
        locale={loc}
      />

      <h1 className="section-title mb-4 sm:mb-6">{heading}</h1>

      {!q ? (
        <div className="card-surface py-12 text-center text-secondary">
          {loc === "ru"
            ? "Введите запрос в поиске: бренд, модель или ключевое слово (например, merger, lynx, hikmicro)."
            : "Введіть запит у пошуку: бренд, модель або ключове слово (наприклад, merger, lynx, hikmicro)."}
        </div>
      ) : (
        <Suspense fallback={null}>
          <CatalogFiltersDrawer brands={result.brands} detectionRangeBounds={null}>
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

            <Suspense fallback={null}>
              <Pagination
                page={result.page}
                total={result.total}
                limit={result.limit}
              />
            </Suspense>
          </CatalogFiltersDrawer>
        </Suspense>
      )}
    </div>
  );
}
