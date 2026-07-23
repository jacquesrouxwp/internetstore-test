import type {
  Brand,
  CatalogFilters,
  CatalogResult,
  Category,
  Product,
} from "@/types";
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
    let query = supabase
      .from("products")
      .select("*, brands(slug, name), categories(slug)", { count: "exact" })
      .eq("published", true);

    if (categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (cat) query = query.eq("category_id", cat.id);
      else return emptyCatalog(page, limit);
    }

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
      query = query.in("resolution", filters.resolutions);
    }
    if (filters.q) {
      const q = filters.q.replace(/%/g, "");
      query = query.or(
        `name_uk.ilike.%${q}%,name_ru.ilike.%${q}%,sku.ilike.%${q}%`
      );
    }
    if (filters.brands?.length) {
      const { data: brandRows } = await supabase
        .from("brands")
        .select("id, slug")
        .in("slug", filters.brands);
      const ids = (brandRows || []).map((b) => b.id);
      if (ids.length) query = query.in("brand_id", ids);
      else return emptyCatalog(page, limit);
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

    const { data, count, error } = await query;
    if (error) {
      console.error("[catalog] query error", error.message);
      return null;
    }

    const [brands, categories] = await Promise.all([
      dbGetBrands(),
      dbGetCategories(),
    ]);

    let detectionRangeBounds: CatalogResult["detectionRangeBounds"] = null;
    if (categorySlug) {
      detectionRangeBounds = await dbDetectionBounds(categorySlug);
    }

    return {
      products: (data || []).map((r) =>
        mapDbProduct(r as Record<string, unknown>)
      ),
      total: count ?? 0,
      page,
      limit,
      brands: brands || [],
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
    return mapDbProduct(data as Record<string, unknown>);
  } catch {
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
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data || []).map((b) => mapDbBrand(b as Record<string, unknown>));
  } catch {
    return null;
  }
}

export async function dbGetCategories(): Promise<Category[] | null> {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data || []).map((c) =>
      mapDbCategory(c as Record<string, unknown>)
    );
  } catch {
    return null;
  }
}

async function dbDetectionBounds(categorySlug: string) {
  const supabase = await getReadClient();
  if (!supabase) return null;
  try {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (!cat) return null;
    const { data: rows } = await supabase
      .from("products")
      .select("detection_range_m")
      .eq("published", true)
      .eq("category_id", cat.id)
      .not("detection_range_m", "is", null);
    const vals = (rows || [])
      .map((r) => Number(r.detection_range_m))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!vals.length) return null;
    const min = Math.min(...vals);
    let max = Math.max(...vals);
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
    brands: getRuntimeBrands(),
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
