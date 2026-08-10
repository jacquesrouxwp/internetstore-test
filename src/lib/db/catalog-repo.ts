import type {
  Brand,
  CatalogFilters,
  CatalogResult,
  Category,
  Product,
} from "@/types";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceClient,
  hasPublicSupabase,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { mapDbBrand, mapDbCategory, mapDbProduct } from "@/lib/supabase/mappers";
import { getDetectionRangeBounds } from "@/lib/detection-range";
import {
  getRuntimeBrands,
  getRuntimeCategories,
  getRuntimeProducts,
  SEED_REVIEWS,
} from "@/data/seed";
import type { Review } from "@/types";
import { getPriceCompareMap } from "@/lib/price-compare/repo";
import { sortBrandsByPriority } from "@/lib/brand-priority";

/**
 * Catalog card fields only — skip heavy description/specs/meta payloads.
 * Cuts JSON size ~5–15× for list pages.
 */
const CATALOG_LIST_SELECT =
  "id, slug, sku, name_uk, name_ru, price, old_price, stock, brand_id, category_id, resolution, device_type, detection_range_m, rating, reviews_count, is_hit, is_new, is_top, is_sale, images, created_at, brands(slug, name), categories(slug)";

async function attachPriceCompare(products: Product[]): Promise<Product[]> {
  if (!products.length || !hasServiceSupabase()) return products;
  try {
    const pricesById: Record<string, number> = {};
    for (const p of products) pricesById[p.id] = p.price;
    const map = await getPriceCompareMap(
      products.map((p) => p.id),
      pricesById
    );
    return products.map((p) => ({
      ...p,
      priceCompare: map[p.id] || null,
    }));
  } catch {
    return products;
  }
}

async function getReadClient() {
  if (hasServiceSupabase()) {
    try {
      return createServiceClient();
    } catch {
      /* fall through */
    }
  }
  if (hasPublicSupabase()) {
    return createClient();
  }
  return null;
}

export async function dbGetCatalog(
  filters: CatalogFilters = {},
  categorySlug?: string
): Promise<CatalogResult | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;

  try {
    // Resolve category id first (tiny row) — needed for filters + bounds
    let categoryId: string | null = null;
    if (categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!cat) return emptyCatalog(page, limit);
      categoryId = String(cat.id);
    }

    // Brand filter ids (if any) — parallel-ready small query
    let brandIds: string[] | null = null;
    if (filters.brands?.length) {
      const { data: brandRows } = await supabase
        .from("brands")
        .select("id, slug")
        .in("slug", filters.brands);
      brandIds = (brandRows || []).map((b) => String(b.id));
      if (!brandIds.length) return emptyCatalog(page, limit);
    }

    let query = supabase
      .from("products")
      .select(CATALOG_LIST_SELECT, { count: "exact" })
      .eq("published", true);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (brandIds) query = query.in("brand_id", brandIds);

    if (filters.priceMin != null) query = query.gte("price", filters.priceMin);
    if (filters.priceMax != null) query = query.lte("price", filters.priceMax);
    if (filters.rangeMin != null)
      query = query.gte("detection_range_m", filters.rangeMin);
    if (filters.rangeMax != null)
      query = query.lte("detection_range_m", filters.rangeMax);
    if (filters.deviceType && filters.deviceType !== "all") {
      query = query.eq("device_type", filters.deviceType);
    }
    if (filters.resolutions?.length) {
      // The sidebar sends the sensor width only ("256"), while the column
      // holds the full geometry ("256x192"), so an exact match never hit and
      // the resolution filter always returned nothing. Match on the prefix.
      const conds = filters.resolutions
        .map((r) => String(r).replace(/[^0-9]/g, ""))
        .filter(Boolean)
        .map((r) => `resolution.ilike.${r}%`)
        .join(",");
      if (conds) query = query.or(conds);
    }
    if (filters.q) {
      const q = filters.q.replace(/%/g, "");
      query = query.or(
        `name_uk.ilike.%${q}%,name_ru.ilike.%${q}%,sku.ilike.%${q}%`
      );
    }
    if (filters.flags?.length) {
      for (const f of filters.flags) {
        if (f === "hit") query = query.eq("is_hit", true);
        if (f === "new") query = query.eq("is_new", true);
        if (f === "top") query = query.eq("is_top", true);
        if (f === "sale") query = query.eq("is_sale", true);
      }
    }

    switch (filters.sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "name_asc":
        query = query.order("name_uk", { ascending: true });
        break;
      case "name_desc":
        query = query.order("name_uk", { ascending: false });
        break;
      case "rating":
        query = query.order("rating", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      default:
        query = query.order("is_top", { ascending: false }).order("rating", {
          ascending: false,
        });
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    // Product page + taxonomy + bounds in parallel (bounds use categoryId)
    const productsPromise = query;
    const brandsPromise = dbGetBrandsCached();
    const categoriesPromise = dbGetCategoriesCached();
    const boundsPromise =
      categorySlug && categoryId
        ? dbDetectionBoundsById(categoryId)
        : Promise.resolve(null);

    const [
      { data, count, error },
      brands,
      categories,
      detectionRangeBounds,
    ] = await Promise.all([
      productsPromise,
      brandsPromise,
      categoriesPromise,
      boundsPromise,
    ]);

    if (error) {
      console.error("[catalog] query error", error.message);
      return null;
    }

    const products = await attachPriceCompare(
      (data || []).map((r) => mapDbProduct(r as Record<string, unknown>))
    );

    return {
      products,
      total: count ?? 0,
      page,
      limit,
      brands: sortBrandsByPriority(brands || []),
      categories: categories || [],
      detectionRangeBounds,
    };
  } catch (e) {
    console.error("[catalog]", e);
    return null;
  }
}

function emptyCatalog(page: number, limit: number): CatalogResult {
  return {
    products: [],
    total: 0,
    page,
    limit,
    brands: [],
    categories: [],
    detectionRangeBounds: null,
  };
}

export async function dbGetProductBySlug(
  slug: string
): Promise<Product | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, brands(slug, name), categories(slug)")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error || !data) return null;
    const product = mapDbProduct(data as Record<string, unknown>);
    const [withCompare] = await attachPriceCompare([product]);
    return withCompare;
  } catch {
    return null;
  }
}

/**
 * Lightweight flag rails (hit/new/top/sale) — only N rows, not full catalog.
 */
export async function dbGetProductsByFlag(
  flag: "hit" | "new" | "top" | "sale",
  limit = 8,
  opts?: { priceCompare?: boolean }
): Promise<Product[] | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  const col =
    flag === "hit"
      ? "is_hit"
      : flag === "new"
        ? "is_new"
        : flag === "top"
          ? "is_top"
          : "is_sale";
  try {
    const { data, error } = await supabase
      .from("products")
      .select(CATALOG_LIST_SELECT)
      .eq("published", true)
      .eq(col, true)
      .order("rating", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const products = (data || []).map((r) =>
      mapDbProduct(r as Record<string, unknown>)
    );
    // Homepage wants badges; PDP secondary rails skip the extra query
    if (opts?.priceCompare === false) return products;
    return attachPriceCompare(products);
  } catch (e) {
    console.error("[products-by-flag]", e);
    return null;
  }
}

/**
 * Lightweight related products for PDP (no full-catalog scan).
 * Prefer same brand, then same category.
 */
export async function dbGetRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[] | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const select = CATALOG_LIST_SELECT;
    // Prefer brand_id (reliable), then category_id, then top-rated
    let rows: unknown[] = [];
    if (product.brandId) {
      const { data, error } = await supabase
        .from("products")
        .select(select)
        .eq("published", true)
        .neq("id", product.id)
        .eq("brand_id", product.brandId)
        .order("rating", { ascending: false })
        .limit(limit);
      if (!error && data?.length) rows = data;
    }
    if (rows.length < limit && product.categoryId) {
      const haveIds = new Set(
        [product.id, ...rows.map((r) => String((r as { id: string }).id))]
      );
      const { data, error } = await supabase
        .from("products")
        .select(select)
        .eq("published", true)
        .eq("category_id", product.categoryId)
        .order("rating", { ascending: false })
        .limit(limit + 4);
      if (!error && data?.length) {
        for (const r of data) {
          const id = String((r as { id: string }).id);
          if (haveIds.has(id)) continue;
          rows.push(r);
          haveIds.add(id);
          if (rows.length >= limit) break;
        }
      }
    }
    if (!rows.length) {
      const { data, error } = await supabase
        .from("products")
        .select(select)
        .eq("published", true)
        .neq("id", product.id)
        .order("rating", { ascending: false })
        .limit(limit);
      if (error || !data?.length) return [];
      rows = data;
    }

    // No price-compare on related rails — keeps PDP TTFB lower
    return rows
      .slice(0, limit)
      .map((r) => mapDbProduct(r as Record<string, unknown>));
  } catch (e) {
    console.error("[related]", e);
    return null;
  }
}

export async function dbGetProductById(id: string): Promise<Product | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, brands(slug, name), categories(slug)")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapDbProduct(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function dbGetAllProductsAdmin(): Promise<Product[] | null> {
  if (!hasServiceSupabase()) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, brands(slug, name), categories(slug)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapDbProduct(r as Record<string, unknown>));
  } catch (e) {
    console.error("[admin products]", e);
    return null;
  }
}

export async function dbGetBrands(): Promise<Brand[] | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    // sort_order first (head brands: AGM, HikMicro, InfiRay…), then name
    const { data, error } = await supabase
      .from("brands")
      .select("id, slug, name, logo_url, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((b) => mapDbBrand(b as Record<string, unknown>));
  } catch {
    return null;
  }
}

/** Cross-request cache — brands rarely change (admin edits). */
export const dbGetBrandsCached = unstable_cache(
  async () => dbGetBrands(),
  ["db-brands-v1"],
  { revalidate: 120, tags: ["brands"] }
);

export async function dbGetCategories(): Promise<Category[] | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("categories")
      .select(
        "id, slug, name_uk, name_ru, description_uk, description_ru, parent_id, sort_order"
      )
      .order("sort_order");
    if (error) throw error;
    return (data || []).map((c) =>
      mapDbCategory(c as Record<string, unknown>)
    );
  } catch {
    return null;
  }
}

export const dbGetCategoriesCached = unstable_cache(
  async () => dbGetCategories(),
  ["db-categories-v1"],
  { revalidate: 120, tags: ["categories"] }
);

/**
 * Brands that actually have at least one published product per category --
 * powers the category hover menu (e.g. hovering "ПНБ" lists only ATN,
 * HikMicro, Rix... the brands stocked there, not every brand in the DB).
 */
async function dbGetCategoryBrandsMapUncached(): Promise<Record<
  string,
  Brand[]
> | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const [{ data: rows, error }, categories, brands] = await Promise.all([
      supabase
        .from("products")
        .select("category_id, brand_id")
        .eq("published", true)
        .not("category_id", "is", null)
        .not("brand_id", "is", null),
      dbGetCategoriesCached(),
      dbGetBrandsCached(),
    ]);
    if (error) throw error;
    if (!categories || !brands) return null;

    const brandById = new Map(brands.map((b) => [b.id, b]));
    const catSlugById = new Map(categories.map((c) => [c.id, c.slug]));

    const seen = new Map<string, Set<string>>(); // categorySlug -> brandIds
    for (const row of rows || []) {
      const catSlug = catSlugById.get(String(row.category_id));
      const brandId = String(row.brand_id);
      if (!catSlug || !brandById.has(brandId)) continue;
      if (!seen.has(catSlug)) seen.set(catSlug, new Set());
      seen.get(catSlug)!.add(brandId);
    }

    const map: Record<string, Brand[]> = {};
    for (const [catSlug, brandIds] of Array.from(seen)) {
      map[catSlug] = Array.from(brandIds)
        .map((id) => brandById.get(id)!)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  } catch {
    return null;
  }
}

/** Cached — layout hits this on every navigation */
export const dbGetCategoryBrandsMap = unstable_cache(
  async () => dbGetCategoryBrandsMapUncached(),
  ["db-category-brands-map-v1"],
  { revalidate: 120, tags: ["category-brands"] }
);

/** Min/max detection range with 2 index-friendly LIMIT 1 queries (not full table). */
async function dbDetectionBoundsById(categoryId: string) {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const base = () =>
      supabase
        .from("products")
        .select("detection_range_m")
        .eq("published", true)
        .eq("category_id", categoryId)
        .not("detection_range_m", "is", null)
        .gt("detection_range_m", 0);

    const [{ data: minRow }, { data: maxRow }] = await Promise.all([
      base().order("detection_range_m", { ascending: true }).limit(1),
      base().order("detection_range_m", { ascending: false }).limit(1),
    ]);

    const min = Number(minRow?.[0]?.detection_range_m);
    let max = Number(maxRow?.[0]?.detection_range_m);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (max <= min) max = min + 1;
    return { min, max };
  } catch {
    return null;
  }
}

/** Prefer DB; fall back to in-memory seed only if DB unavailable */
export async function getCatalogWithFallback(
  filters: CatalogFilters = {},
  categorySlug?: string
): Promise<CatalogResult> {
  const db = await dbGetCatalog(filters, categorySlug);
  if (db) return db;

  // memory fallback (dev without Supabase)
  let list = getRuntimeProducts().filter((p) => p.published);
  if (categorySlug) list = list.filter((p) => p.categorySlug === categorySlug);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.nameUk.toLowerCase().includes(q) ||
        p.nameRu.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
    );
  }
  if (filters.flags?.length) {
    list = list.filter((p) =>
      filters.flags!.some(
        (f) =>
          (f === "hit" && p.isHit) ||
          (f === "new" && p.isNew) ||
          (f === "top" && p.isTop) ||
          (f === "sale" && p.isSale)
      )
    );
  }
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const total = list.length;
  const products = list.slice((page - 1) * limit, page * limit);
  return {
    products,
    total,
    page,
    limit,
    brands: sortBrandsByPriority(getRuntimeBrands()),
    categories: getRuntimeCategories(),
    detectionRangeBounds: getDetectionRangeBounds(
      getRuntimeProducts().filter((p) => p.published),
      categorySlug
    ),
  };
}

export function getReviewsSeed(): Review[] {
  return SEED_REVIEWS;
}
