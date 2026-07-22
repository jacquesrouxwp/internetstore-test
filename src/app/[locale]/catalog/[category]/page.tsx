import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductCard } from "@/components/ui/ProductCard";
import { getCatalog, getCategoryBySlug } from "@/lib/catalog";
import { Link } from "@/i18n/routing";
import { categoryName } from "@/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function paramList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Catalog" };
  const name = categoryName(cat, locale as "uk" | "ru");
  return {
    title: name,
    description: (locale === "ru" ? cat.descriptionRu : cat.descriptionUk) || name,
  };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale, category } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const t = await getTranslations("catalog");
  const tn = await getTranslations("nav");

  const page = Number(sp.page || 1);
  const limit = Number(sp.limit || 12);
  const result = await getCatalog(
    {
      brands: paramList(sp.brand),
      resolutions: paramList(sp.res),
      deviceType: typeof sp.type === "string" ? sp.type : "all",
      priceMin: sp.min ? Number(sp.min) : undefined,
      priceMax: sp.max ? Number(sp.max) : undefined,
      q: typeof sp.q === "string" ? sp.q : undefined,
      sort: typeof sp.sort === "string" ? sp.sort : "default",
      page,
      limit,
    },
    category
  );

  const title = categoryName(cat, locale as "uk" | "ru");

  return (
    <div className="container-shop py-6 sm:py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-secondary">
        <Link href="/" className="hover:text-[var(--accent)]">
          {tn("home")}
        </Link>
        <span className="text-faint">/</span>
        <span className="text-primary">{title}</span>
      </nav>

      <h1 className="section-title mb-6">{title}</h1>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Suspense fallback={null}>
          <CatalogFilters brands={result.brands} />
        </Suspense>

        <div>
          <Suspense fallback={null}>
            <CatalogToolbar total={result.total} />
          </Suspense>

          {result.products.length === 0 ? (
            <div className="card-surface py-16 text-center text-secondary">
              {t("empty")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <Suspense fallback={null}>
            <Pagination
              page={result.page}
              total={result.total}
              limit={result.limit}
            />
          </Suspense>

          <article
            className="mt-12 max-w-none pt-8 text-secondary"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <h2 className="font-display text-xl font-semibold text-primary">
              {t("buyThermal")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed">{t("seoText")}</p>
            {(locale === "ru" ? cat.descriptionRu : cat.descriptionUk) && (
              <p className="mt-3 text-sm leading-relaxed">
                {locale === "ru" ? cat.descriptionRu : cat.descriptionUk}
              </p>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
