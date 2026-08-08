import { cache } from "react";
import type {
  Brand,
  CatalogFilters,
  CatalogResult,
  Category,
  Product,
  Review,
} from "@/types";
import {
  dbGetBrands,
  dbGetCategories,
  dbGetCategoryBrandsMap,
  dbGetProductBySlug,
  dbGetRelatedProducts,
  dbGetProductsByFlag,
  getCatalogWithFallback,
  getReviewsSeed,
} from "@/lib/db/catalog-repo";
import {
  getRuntimeBrands,
  getRuntimeCategories,
  getRuntimeProducts,
} from "@/data/seed";
import { getDetectionRangeBounds } from "@/lib/detection-range";
import { hasPublicSupabase } from "@/lib/supabase/service";
import { sortBrandsByPriority } from "@/lib/brand-priority";

export async function getCatalog(
  filters: CatalogFilters = {},
  categorySlug?: string
): Promise<CatalogResult> {
  return getCatalogWithFallback(filters, categorySlug);
}

export function getCategoryDetectionRangeBounds(categorySlug: string) {
  return getDetectionRangeBounds(
    getRuntimeProducts().filter((p) => p.published),
    categorySlug
  );
}

/**
 * Deduped per-request (metadata + page share one Supabase hit).
 */
export const getProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const fromDb = await dbGetProductBySlug(slug);
    if (fromDb) return fromDb;
    // fallback only without supabase
    if (hasPublicSupabase()) return null;
    return getRuntimeProducts().find((p) => p.slug === slug) || null;
  }
);

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  // Lightweight DB path — avoids loading 50 products + full price-compare map
  const fromDb = await dbGetRelatedProducts(product, limit);
  if (fromDb) return fromDb;
  if (hasPublicSupabase()) return [];
  return getRuntimeProducts()
    .filter(
      (p) =>
        p.published &&
        p.id !== product.id &&
        (p.brandSlug === product.brandSlug ||
          p.categorySlug === product.categorySlug)
    )
    .slice(0, limit);
}

export async function getProductsByFlag(
  flag: "hit" | "new" | "top" | "sale",
  limit = 8,
  opts?: { priceCompare?: boolean }
): Promise<Product[]> {
  const fromDb = await dbGetProductsByFlag(flag, limit, opts);
  if (fromDb) return fromDb;
  if (hasPublicSupabase()) return [];
  // in-memory seed fallback
  const result = await getCatalog({ flags: [flag], limit, sort: "rating" });
  return result.products;
}

export async function getBrands(): Promise<Brand[]> {
  const db = await dbGetBrands();
  if (db?.length) return sortBrandsByPriority(db);
  return sortBrandsByPriority(getRuntimeBrands());
}

export async function getCategories(): Promise<Category[]> {
  const db = await dbGetCategories();
  if (db?.length) return db;
  return getRuntimeCategories();
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) || null;
}

/**
 * categorySlug -> brands shown in the category hover menu. Normally the
 * brands that actually stock that category; categories with none fall back
 * to the full brand list so the menu is never empty (owner's call — an
 * empty menu looks broken, a human can narrow it down from there).
 */
export async function getCategoryBrandsMap(): Promise<Record<string, Brand[]>> {
  const [categories, allBrands] = await Promise.all([
    getCategories(),
    getBrands(),
  ]);

  let withProducts = await dbGetCategoryBrandsMap();
  if (!withProducts) {
    // memory fallback (dev without Supabase)
    const products = getRuntimeProducts().filter((p) => p.published);
    const brandBySlug = new Map(allBrands.map((b) => [b.slug, b]));
    const acc: Record<string, Map<string, Brand>> = {};
    for (const p of products) {
      if (!p.categorySlug || !p.brandSlug) continue;
      const brand = brandBySlug.get(p.brandSlug);
      if (!brand) continue;
      if (!acc[p.categorySlug]) acc[p.categorySlug] = new Map();
      acc[p.categorySlug].set(brand.id, brand);
    }
    withProducts = {};
    for (const [catSlug, byId] of Object.entries(acc)) {
      withProducts[catSlug] = Array.from(byId.values());
    }
  }

  const sortedAll = sortBrandsByPriority(allBrands);
  const result: Record<string, Brand[]> = {};
  for (const c of categories) {
    const stocked = withProducts[c.slug];
    result[c.slug] = stocked?.length
      ? sortBrandsByPriority(stocked)
      : sortedAll;
  }
  return result;
}

export function getReviews(): Review[] {
  return getReviewsSeed();
}
