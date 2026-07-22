import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_REVIEWS,
  getRuntimeProducts,
} from "@/data/seed";
import type {
  Brand,
  CatalogFilters,
  CatalogResult,
  Category,
  Product,
  Review,
} from "@/types";
import { createClient } from "@/lib/supabase/server";
import { getDetectionRangeBounds } from "@/lib/detection-range";

function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function mapDbProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    sku: (row.sku as string) || null,
    nameUk: String(row.name_uk),
    nameRu: String(row.name_ru),
    descriptionUk: (row.description_uk as string) || null,
    descriptionRu: (row.description_ru as string) || null,
    shortUk: (row.short_uk as string) || null,
    shortRu: (row.short_ru as string) || null,
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    stock: Number(row.stock ?? 0),
    brandId: (row.brand_id as string) || null,
    brandSlug: (row.brands as { slug?: string } | null)?.slug || null,
    brandName: (row.brands as { name?: string } | null)?.name || null,
    categoryId: (row.category_id as string) || null,
    categorySlug: (row.categories as { slug?: string } | null)?.slug || null,
    resolution: (row.resolution as string) || null,
    deviceType: (row.device_type as Product["deviceType"]) || null,
    detectionRangeM:
      row.detection_range_m != null ? Number(row.detection_range_m) : null,
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    isHit: Boolean(row.is_hit),
    isNew: Boolean(row.is_new),
    isTop: Boolean(row.is_top),
    isSale: Boolean(row.is_sale),
    images: (row.images as string[]) || [],
    specs: (row.specs as Record<string, string>) || {},
    published: Boolean(row.published ?? true),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function filterSeed(
  filters: CatalogFilters = {},
  categorySlug?: string
): CatalogResult {
  let list = getRuntimeProducts().filter((p) => p.published);

  if (categorySlug) {
    list = list.filter((p) => p.categorySlug === categorySlug);
  }

  // Bounds from full category set (before range filter), so slider edges stay stable
  const detectionRangeBounds = getDetectionRangeBounds(
    getRuntimeProducts().filter((p) => p.published),
    categorySlug
  );

  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.nameUk.toLowerCase().includes(q) ||
        p.nameRu.toLowerCase().includes(q) ||
        (p.brandName || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
    );
  }

  if (filters.brands?.length) {
    const set = new Set(filters.brands.map((b) => b.toLowerCase()));
    list = list.filter(
      (p) =>
        set.has((p.brandSlug || "").toLowerCase()) ||
        set.has((p.brandName || "").toLowerCase())
    );
  }

  if (filters.resolutions?.length) {
    list = list.filter((p) => {
      const r = (p.resolution || "").replace("×", "x");
      return filters.resolutions!.some((f) => r.startsWith(f.replace("×", "x")));
    });
  }

  if (filters.deviceType && filters.deviceType !== "all") {
    list = list.filter((p) => p.deviceType === filters.deviceType);
  }

  if (filters.priceMin != null) {
    list = list.filter((p) => p.price >= filters.priceMin!);
  }
  if (filters.priceMax != null) {
    list = list.filter((p) => p.price <= filters.priceMax!);
  }

  if (filters.rangeMin != null) {
    list = list.filter(
      (p) =>
        p.detectionRangeM != null && p.detectionRangeM >= filters.rangeMin!
    );
  }
  if (filters.rangeMax != null) {
    list = list.filter(
      (p) =>
        p.detectionRangeM != null && p.detectionRangeM <= filters.rangeMax!
    );
  }

  if (filters.flags?.includes("hit")) list = list.filter((p) => p.isHit);
  if (filters.flags?.includes("new")) list = list.filter((p) => p.isNew);
  if (filters.flags?.includes("top")) list = list.filter((p) => p.isTop);
  if (filters.flags?.includes("sale")) list = list.filter((p) => p.isSale);

  switch (filters.sort) {
    case "price_asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "name_asc":
      list.sort((a, b) => a.nameUk.localeCompare(b.nameUk, "uk"));
      break;
    case "name_desc":
      list.sort((a, b) => b.nameUk.localeCompare(a.nameUk, "uk"));
      break;
    case "rating":
      list.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    default:
      list.sort(
        (a, b) => Number(b.isTop) - Number(a.isTop) || b.rating - a.rating
      );
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const total = list.length;
  const start = (page - 1) * limit;
  const products = list.slice(start, start + limit);

  return {
    products,
    total,
    page,
    limit,
    brands: SEED_BRANDS,
    categories: SEED_CATEGORIES,
    detectionRangeBounds,
  };
}

export async function getCatalog(
  filters: CatalogFilters = {},
  categorySlug?: string
): Promise<CatalogResult> {
  if (!hasSupabase()) {
    return filterSeed(filters, categorySlug);
  }

  try {
    const supabase = await createClient();
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
    }

    if (filters.priceMin != null) query = query.gte("price", filters.priceMin);
    if (filters.priceMax != null) query = query.lte("price", filters.priceMax);
    if (filters.rangeMin != null) {
      query = query.gte("detection_range_m", filters.rangeMin);
    }
    if (filters.rangeMax != null) {
      query = query.lte("detection_range_m", filters.rangeMax);
    }
    if (filters.deviceType && filters.deviceType !== "all") {
      query = query.eq("device_type", filters.deviceType);
    }
    if (filters.resolutions?.length) {
      query = query.in("resolution", filters.resolutions);
    }
    if (filters.q) {
      query = query.or(
        `name_uk.ilike.%${filters.q}%,name_ru.ilike.%${filters.q}%,sku.ilike.%${filters.q}%`
      );
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

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const { data: brands } = await supabase.from("brands").select("*");
    const { data: categories } = await supabase.from("categories").select("*");

    let detectionRangeBounds: CatalogResult["detectionRangeBounds"] = null;
    if (categorySlug) {
      try {
        let boundsQ = supabase
          .from("products")
          .select("detection_range_m")
          .eq("published", true)
          .not("detection_range_m", "is", null);
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (cat) boundsQ = boundsQ.eq("category_id", cat.id);
        const { data: rangeRows } = await boundsQ;
        if (rangeRows?.length) {
          const vals = rangeRows
            .map((r) => Number(r.detection_range_m))
            .filter((n) => Number.isFinite(n) && n > 0);
          if (vals.length) {
            detectionRangeBounds = {
              min: Math.min(...vals),
              max: Math.max(...vals),
            };
            if (detectionRangeBounds.max <= detectionRangeBounds.min) {
              detectionRangeBounds.max = detectionRangeBounds.min + 1;
            }
          }
        }
      } catch {
        /* ignore bounds errors */
      }
    }

    return {
      products: (data || []).map((r) =>
        mapDbProduct(r as Record<string, unknown>)
      ),
      total: count ?? 0,
      page,
      limit,
      brands: (brands || []).map(
        (b): Brand => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          logoUrl: b.logo_url,
        })
      ),
      categories: (categories || []).map(
        (c): Category => ({
          id: c.id,
          slug: c.slug,
          nameUk: c.name_uk,
          nameRu: c.name_ru,
          descriptionUk: c.description_uk,
          descriptionRu: c.description_ru,
          parentId: c.parent_id,
          sortOrder: c.sort_order,
        })
      ),
      detectionRangeBounds,
    };
  } catch {
    return filterSeed(filters, categorySlug);
  }
}

/** Public helper for category detection bounds (seed path) */
export function getCategoryDetectionRangeBounds(categorySlug: string) {
  return getDetectionRangeBounds(
    getRuntimeProducts().filter((p) => p.published),
    categorySlug
  );
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasSupabase()) {
    return getRuntimeProducts().find((p) => p.slug === slug) || null;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, brands(slug, name), categories(slug)")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      return getRuntimeProducts().find((p) => p.slug === slug) || null;
    }
    return mapDbProduct(data as Record<string, unknown>);
  } catch {
    return getRuntimeProducts().find((p) => p.slug === slug) || null;
  }
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
  if (!hasSupabase()) return SEED_BRANDS;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("brands").select("*").order("name");
    if (!data?.length) return SEED_BRANDS;
    return data.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      logoUrl: b.logo_url,
    }));
  } catch {
    return SEED_BRANDS;
  }
}

export async function getCategories(): Promise<Category[]> {
  if (!hasSupabase()) return SEED_CATEGORIES;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (!data?.length) return SEED_CATEGORIES;
    return data.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameUk: c.name_uk,
      nameRu: c.name_ru,
      descriptionUk: c.description_uk,
      descriptionRu: c.description_ru,
      parentId: c.parent_id,
      sortOrder: c.sort_order,
    }));
  } catch {
    return SEED_CATEGORIES;
  }
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) || null;
}

export function getReviews(): Review[] {
  return SEED_REVIEWS;
}
