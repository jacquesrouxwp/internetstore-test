import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
} from "@/data/seed";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Upsert seed catalog into Supabase (idempotent by slug).
 * Server-only. Uses service_role.
 */
export async function seedSupabaseCatalog(): Promise<{
  brands: number;
  categories: number;
  products: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  // Brands
  const brandRows = SEED_BRANDS.map((b, i) => ({
    slug: b.slug,
    name: b.name,
    logo_url: b.logoUrl || null,
    sort_order: i,
  }));
  const { error: brandErr } = await supabase
    .from("brands")
    .upsert(brandRows, { onConflict: "slug" });
  if (brandErr) errors.push(`brands: ${brandErr.message}`);

  const { data: brandsDb } = await supabase.from("brands").select("id, slug");
  const brandBySlug = new Map(
    (brandsDb || []).map((b) => [b.slug as string, b.id as string])
  );

  // Categories
  const catRows = SEED_CATEGORIES.map((c) => ({
    slug: c.slug,
    name_uk: c.nameUk,
    name_ru: c.nameRu,
    description_uk: c.descriptionUk || null,
    description_ru: c.descriptionRu || null,
    sort_order: c.sortOrder ?? 0,
  }));
  const { error: catErr } = await supabase
    .from("categories")
    .upsert(catRows, { onConflict: "slug" });
  if (catErr) errors.push(`categories: ${catErr.message}`);

  const { data: catsDb } = await supabase
    .from("categories")
    .select("id, slug");
  const catBySlug = new Map(
    (catsDb || []).map((c) => [c.slug as string, c.id as string])
  );

  // Products
  const productRows = SEED_PRODUCTS.map((p) => ({
    slug: p.slug,
    sku: p.sku || null,
    name_uk: p.nameUk,
    name_ru: p.nameRu,
    description_uk: p.descriptionUk || null,
    description_ru: p.descriptionRu || null,
    short_uk: p.shortUk || null,
    short_ru: p.shortRu || null,
    price: p.price,
    old_price: p.oldPrice ?? null,
    stock: p.stock,
    brand_id: p.brandSlug ? brandBySlug.get(p.brandSlug) || null : null,
    category_id: p.categorySlug
      ? catBySlug.get(p.categorySlug) || null
      : null,
    resolution: p.resolution || null,
    device_type: p.deviceType || null,
    detection_range_m: p.detectionRangeM ?? null,
    rating: p.rating ?? 0,
    reviews_count: p.reviewsCount ?? 0,
    is_hit: p.isHit,
    is_new: p.isNew,
    is_top: p.isTop,
    is_sale: p.isSale,
    images: p.images || [],
    specs: p.specs || {},
    published: true,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in chunks
  const chunk = 20;
  for (let i = 0; i < productRows.length; i += chunk) {
    const slice = productRows.slice(i, i + chunk);
    const { error } = await supabase
      .from("products")
      .upsert(slice, { onConflict: "slug" });
    if (error) errors.push(`products[${i}]: ${error.message}`);
  }

  const { count: brandsCount } = await supabase
    .from("brands")
    .select("*", { count: "exact", head: true });
  const { count: catsCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });
  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  console.log(
    `[seed] brands=${brandsCount} categories=${catsCount} products=${productsCount}`
  );

  return {
    brands: brandsCount ?? 0,
    categories: catsCount ?? 0,
    products: productsCount ?? 0,
    errors,
  };
}
