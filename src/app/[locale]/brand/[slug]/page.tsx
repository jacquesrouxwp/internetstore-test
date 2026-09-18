import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BrandListing } from "@/components/brand/BrandListing";
import { getBrandBySlug, getBrandProductRows } from "@/lib/catalog";
import {
  MIN_INDEXABLE_PRODUCTS,
  brandDisplayName,
  brandMetaDescription,
  brandPageTitle,
  summarizeBrand,
  type Locale,
} from "@/lib/brand-pages";
import { catalogCanonicalPath, pageFromQuery } from "@/lib/pagination";
import { pageAlternates } from "@/lib/seo-alternates";

// searchParams (filters, page) → dynamic; brand rows are cached 120s.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const loc = locale as Locale;
  const [brand, rows] = await Promise.all([getBrandBySlug(slug), getBrandProductRows()]);
  if (!brand) return { title: "Brand" };
  const name = brandDisplayName(slug, brand.name);
  const summary = summarizeBrand(rows, slug, loc);
  const basePath = `/brand/${slug}`;
  const canonicalPath = catalogCanonicalPath(basePath, sp);
  const page = canonicalPath === basePath ? 1 : pageFromQuery(sp);
  const { title } = brandPageTitle(name, summary, loc, { page });
  return {
    title,
    description: brandMetaDescription(name, summary, loc),
    alternates: pageAlternates(locale, canonicalPath),
    // A brand with one or two products is a thin page — its product pages
    // carry it better. Keep it reachable but out of the index.
    ...(summary.total < MIN_INDEXABLE_PRODUCTS
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const [brand, rows] = await Promise.all([getBrandBySlug(slug), getBrandProductRows()]);
  // A brand with no products still gets a page (noindex via metadata): the
  // homepage logo grid links every brand, and a 404 there reads as broken.
  if (!brand) notFound();
  return (
    <BrandListing
      locale={locale as Locale}
      brand={{ ...brand, name: brandDisplayName(slug, brand.name) }}
      rows={rows}
      query={sp}
    />
  );
}
