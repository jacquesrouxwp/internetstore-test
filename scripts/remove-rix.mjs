/**
 * Delete Rix brand + all its products from Supabase (and related links).
 * Usage: node scripts/remove-rix.mjs
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: brand, error: bErr } = await sb
  .from("brands")
  .select("id, slug, name")
  .eq("slug", "rix")
  .maybeSingle();

if (bErr) {
  console.error("brand lookup", bErr);
  process.exit(1);
}

if (!brand) {
  console.log("No brand slug=rix — nothing to delete");
  process.exit(0);
}

console.log("Found brand", brand);

const { data: products, error: pErr } = await sb
  .from("products")
  .select("id, slug")
  .eq("brand_id", brand.id);

if (pErr) {
  console.error("products", pErr);
  process.exit(1);
}

const ids = (products || []).map((p) => p.id);
console.log("Products to delete:", (products || []).map((p) => p.slug));

if (ids.length) {
  // competitor links first (FK)
  await sb.from("competitor_product_links").delete().in("product_id", ids);
  const { error: delP } = await sb.from("products").delete().in("id", ids);
  if (delP) {
    console.error("delete products", delP);
    process.exit(1);
  }
  console.log("Deleted", ids.length, "products");
}

// unpublish blog posts about rix if table exists
try {
  await sb
    .from("blog_posts")
    .update({ published: false })
    .ilike("slug", "%rix%");
} catch {
  /* optional */
}

const { error: delB } = await sb.from("brands").delete().eq("id", brand.id);
if (delB) {
  console.error("delete brand", delB);
  process.exit(1);
}

console.log("Deleted brand rix. Done.");
