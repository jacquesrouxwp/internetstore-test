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
  dbGetProductBySlug,
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

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const fromDb = await dbGetProductBySlug(slug);
  if (fromDb) return fromDb;
  // fallback only without supabase
  if (hasPublicSupabase()) return null;
  return getRuntimeProducts().find((p) => p.slug === slug) || null;
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const all = await getCatalog({ limit: 50, sort: "rating" });
  return all.products
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.brandSlug === product.brandSlug ||
          p.categorySlug === product.categorySlug)
    )
    .slice(0, limit);
}

export async function getProductsByFlag(
  flag: "hit" | "new" | "top" | "sale",
  limit = 8
): Promise<Product[]> {
  const result = await getCatalog({ flags: [flag], limit, sort: "rating" });
  return result.products;
}

export async function getBrands(): Promise<Brand[]> {
  const db = await dbGetBrands();
  if (db?.length) return db;
  return getRuntimeBrands();
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

export function getReviews(): Review[] {
  return getReviewsSeed();
}
