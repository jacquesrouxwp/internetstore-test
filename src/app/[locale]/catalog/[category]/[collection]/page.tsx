import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CollectionListing } from "@/components/catalog/CollectionListing";
import { getBrandProductRows, getCategoryBySlug } from "@/lib/catalog";
import {
  MIN_INDEXABLE_PRODUCTS,
  brandDisplayName,
  type Locale,
} from "@/lib/brand-pages";
import {
  collectionDescription,
  collectionTitle,
  getCollection,
  summarizeCollection,
} from "@/lib/collections";
import { catalogCanonicalPath, pageFromQuery } from "@/lib/pagination";
import { pageAlternates } from "@/lib/seo-alternates";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; category: string; collection: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, category, collection: slug } = await params;
  const sp = await searchParams;
  const loc = locale as Locale;
  const collection = getCollection(category, slug);
  if (!collection) return { title: "Catalog" };
  const rows = await getBrandProductRows();
  const summary = summarizeCollection(rows, collection, loc, brandDisplayName);
  const basePath = `/catalog/${category}/${slug}`;
  const canonicalPath = catalogCanonicalPath(basePath, sp);
  const page = canonicalPath === basePath ? 1 : pageFromQuery(sp);
  return {
    title: collectionTitle(collection, loc, page),
    description: collectionDescription(collection, summary, loc),
    alternates: pageAlternates(locale, canonicalPath),
    ...(summary.total < MIN_INDEXABLE_PRODUCTS
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale, category: categorySlug, collection: slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const collection = getCollection(categorySlug, slug);
  if (!collection) notFound();
  const [category, rows] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getBrandProductRows(),
  ]);
  if (!category) notFound();
  return (
    <CollectionListing
      locale={locale as Locale}
      category={category}
      collection={collection}
      rows={rows}
      query={sp}
    />
  );
}
