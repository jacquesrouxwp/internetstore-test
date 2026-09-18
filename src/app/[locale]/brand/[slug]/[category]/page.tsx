import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BrandListing } from "@/components/brand/BrandListing";
import {
  getBrandBySlug,
  getBrandProductRows,
  getCategoryBySlug,
} from "@/lib/catalog";
import {
  MIN_INDEXABLE_PRODUCTS,
  brandDisplayName,
  brandMetaDescription,
  brandPageTitle,
  categoryWords,
  summarizeBrand,
  type Locale,
} from "@/lib/brand-pages";
import { categoryName } from "@/types";
import { catalogCanonicalPath, pageFromQuery } from "@/lib/pagination";
import { localizedPath, pageAlternates } from "@/lib/seo-alternates";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug, category } = await params;
  const sp = await searchParams;
  const loc = locale as Locale;
  const [brand, cat, rows] = await Promise.all([
    getBrandBySlug(slug),
    getCategoryBySlug(category),
    getBrandProductRows(),
  ]);
  if (!brand || !cat) return { title: "Brand" };
  const summary = summarizeBrand(rows, slug, loc, category);
  const basePath = `/brand/${slug}/${category}`;
  const canonicalPath = catalogCanonicalPath(basePath, sp);
  const page = canonicalPath === basePath ? 1 : pageFromQuery(sp);
  const catLabel = categoryName(cat, loc);
  const name = brandDisplayName(slug, brand.name);
  const { title } = brandPageTitle(name, summary, loc, {
    categorySlug: category,
    categoryName: catLabel,
    page,
  });
  return {
    title,
    description: brandMetaDescription(
      name,
      summary,
      loc,
      categoryWords(category, loc, catLabel).full
    ),
    alternates: pageAlternates(locale, canonicalPath),
    ...(summary.total < MIN_INDEXABLE_PRODUCTS
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

export default async function BrandCategoryPage({ params, searchParams }: Props) {
  const { locale, slug, category } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const [brand, cat, rows] = await Promise.all([
    getBrandBySlug(slug),
    getCategoryBySlug(category),
    getBrandProductRows(),
  ]);
  if (!brand || !cat) notFound();
  // The header menu can list a brand under a category it has no stock in;
  // send those visitors to the brand page instead of an empty listing.
  if (!rows.some((r) => r.brandSlug === slug && r.categorySlug === category)) {
    redirect(localizedPath(locale, `/brand/${slug}`));
  }
  return (
    <BrandListing
      locale={locale as Locale}
      brand={{ ...brand, name: brandDisplayName(slug, brand.name) }}
      rows={rows}
      categorySlug={category}
      query={sp}
    />
  );
}
