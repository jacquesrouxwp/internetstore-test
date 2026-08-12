/**
 * Hard purge every Rix trace from Supabase + local public assets.
 * - products by brand slug, name, slug
 * - brand row
 * - blog posts
 * - local images
 */
import { createClient } from "@supabase/supabase-js";
import {
  readFileSync,
  existsSync,
  unlinkSync,
  readdirSync,
  statSync,
} from "fs";
import { resolve, join } from "path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function isRixProduct(p) {
  const blob = [
    p.slug,
    p.sku,
    p.name_uk,
    p.name_ru,
    p.brand_slug,
    p.brands?.slug,
    p.brands?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  // whole-word rix (avoid matching matrix etc.)
  return /\brix\b/.test(blob) || blob.includes("rix-") || blob.startsWith("rix");
}

// 1) brand
const { data: brands } = await sb
  .from("brands")
  .select("id, slug, name")
  .or("slug.eq.rix,name.ilike.rix,name.ilike.Rix%");

console.log("brands match:", brands || []);

const brandIds = new Set((brands || []).map((b) => b.id));

// 2) all products — filter client-side for rix mentions
const { data: allProducts, error: pErr } = await sb
  .from("products")
  .select("id, slug, sku, name_uk, name_ru, brand_id, brands(slug, name)");

if (pErr) {
  console.error("products", pErr);
  process.exit(1);
}

const toDelete = (allProducts || []).filter(
  (p) => brandIds.has(p.brand_id) || isRixProduct(p)
);

console.log(
  "products to delete:",
  toDelete.map((p) => p.slug)
);

const ids = toDelete.map((p) => p.id);

if (ids.length) {
  // competitor links
  const { error: cErr } = await sb
    .from("competitor_product_links")
    .delete()
    .in("product_id", ids);
  if (cErr) console.log("competitor_links:", cErr.message);

  // order_items? keep history — only null product_id if FK allows; skip if not
  try {
    await sb.from("order_items").update({ product_id: null }).in("product_id", ids);
  } catch {
    /* optional */
  }

  const { error: dErr } = await sb.from("products").delete().in("id", ids);
  if (dErr) {
    console.error("delete products", dErr);
    process.exit(1);
  }
  console.log("deleted products:", ids.length);
} else {
  console.log("no products to delete");
}

// 3) delete brands
if (brandIds.size) {
  const { error: bErr } = await sb
    .from("brands")
    .delete()
    .in("id", [...brandIds]);
  if (bErr) console.error("delete brands", bErr);
  else console.log("deleted brands:", [...brandIds].length);
}

// 4) blog
try {
  const { data: posts } = await sb
    .from("blog_posts")
    .select("id, slug, title_uk")
    .or("slug.ilike.%rix%,title_uk.ilike.%rix%,title_ru.ilike.%rix%,body_uk.ilike.%rix%,body_ru.ilike.%rix%");
  console.log("blog hits:", (posts || []).map((p) => p.slug));
  if (posts?.length) {
    await sb
      .from("blog_posts")
      .update({ published: false })
      .in(
        "id",
        posts.map((p) => p.id)
      );
    // hard delete rix-named posts
    await sb
      .from("blog_posts")
      .delete()
      .or("slug.ilike.%rix%,title_uk.ilike.%Rix%,title_ru.ilike.%Rix%");
    console.log("blog cleaned");
  }
} catch (e) {
  console.log("blog skip", e.message);
}

// 5) storage folders with rix
try {
  const { data: folders } = await sb.storage.from("product-images").list("", {
    limit: 200,
  });
  for (const f of folders || []) {
    const name = f.name || "";
    if (!/rix/i.test(name)) continue;
    console.log("storage folder", name);
    const { data: files } = await sb.storage
      .from("product-images")
      .list(name, { limit: 100 });
    if (files?.length) {
      const paths = files.map((x) => `${name}/${x.name}`);
      await sb.storage.from("product-images").remove(paths);
    }
  }
} catch (e) {
  console.log("storage skip", e.message);
}

// 6) verify
const { data: left } = await sb
  .from("products")
  .select("slug, name_uk, brands(slug)")
  .or("slug.ilike.%rix%,name_uk.ilike.%rix%,name_ru.ilike.%rix%");
console.log("remaining name/slug rix:", left || []);

const { data: bLeft } = await sb.from("brands").select("slug,name").ilike("slug", "%rix%");
console.log("remaining brands:", bLeft || []);

// 7) local files
const dirs = [
  resolve("public/products"),
  resolve("public/brands"),
];
for (const dir of dirs) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (!/rix/i.test(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isFile()) {
      unlinkSync(full);
      console.log("deleted file", full);
    }
  }
}

console.log("PURGE DONE");
