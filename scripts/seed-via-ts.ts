import { createClient } from "@supabase/supabase-js";
import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
} from "../src/data/seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("Seeding to", url.replace(/^https?:\/\//, "").split("/")[0]);

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
  if (brandErr) {
    console.error("brands:", brandErr.message);
    process.exit(1);
  }

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
  if (catErr) {
    console.error("categories:", catErr.message);
    process.exit(1);
  }

  const { data: catsDb } = await supabase.from("categories").select("id, slug");
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

  for (let i = 0; i < productRows.length; i += 20) {
    const slice = productRows.slice(i, i + 20);
    const { error } = await supabase
      .from("products")
      .upsert(slice, { onConflict: "slug" });
    if (error) {
      console.error(`products[${i}]:`, error.message);
      process.exit(1);
    }
  }

  // Competitors top-3
  await supabase.from("competitors").upsert(
    [
      {
        slug: "opticstore",
        name: "OpticStore",
        website: "https://opticstore.com.ua/catalog/teplovizory",
        sort_order: 1,
        is_active: true,
      },
      {
        slug: "profoptica",
        name: "ProfOptica",
        website: "https://profoptica.com.ua/teplovizory/",
        sort_order: 2,
        is_active: true,
      },
      {
        slug: "optics-pro",
        name: "Optics-Pro",
        website: "https://www.optics-pro.com.ua/ua/teplovizori/",
        sort_order: 3,
        is_active: true,
      },
    ],
    { onConflict: "slug" }
  );

  const counts: Record<string, number | null> = {};
  for (const t of [
    "brands",
    "categories",
    "products",
    "competitors",
    "orders",
  ]) {
    const { count, error } = await supabase
      .from(t)
      .select("*", { count: "exact", head: true });
    if (error) console.error(t, error.message);
    else counts[t] = count;
  }

  console.log("SEED OK", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
