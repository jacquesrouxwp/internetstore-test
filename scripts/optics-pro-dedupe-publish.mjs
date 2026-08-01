/**
 * Post-import maintenance for the optics-pro.com.ua batch:
 *  1. Find products imported from optics-pro.com.ua (tagged via specs._sourceSite).
 *  2. Detect true duplicates (same brand_id + sku loaded more than once), delete extras.
 *  3. Publish the surviving rows (published = true) so they show on the storefront.
 *
 * Usage: node scripts/optics-pro-dedupe-publish.mjs [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).replace(/^﻿/, "").trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  /* no .env.local */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAllProducts() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, sku, name_uk, brand_id, category_id, published, specs, created_at, images")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY-RUN (no writes)" : "LIVE"}`);
  const all = await fetchAllProducts();
  console.log(`Total products in DB: ${all.length}`);

  const imported = all.filter((p) => p.specs && p.specs._sourceSite === "optics-pro.com.ua");
  console.log(`Products tagged as imported from optics-pro.com.ua: ${imported.length}`);

  // Group by brand_id + sku to find true duplicates
  const groups = new Map();
  for (const p of imported) {
    const key = `${p.brand_id || "?"}::${(p.sku || "").trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`\nDuplicate groups (same brand+sku loaded more than once): ${dupGroups.length}`);

  const toDelete = [];
  for (const g of dupGroups) {
    g.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const keep = g[0];
    const extras = g.slice(1);
    console.log(`  "${keep.name_uk}" (sku=${keep.sku}) -- keeping ${keep.id}, deleting ${extras.length}`);
    for (const e of extras) toDelete.push(e);
  }

  if (toDelete.length) {
    console.log(`\nDeleting ${toDelete.length} duplicate rows...`);
    if (!dryRun) {
      const ids = toDelete.map((p) => p.id);
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    }
    console.log(dryRun ? "  (skipped -- dry-run)" : "  done.");
  } else {
    console.log("\nNo duplicates found.");
  }

  const survivorIds = new Set(imported.map((p) => p.id));
  for (const d of toDelete) survivorIds.delete(d.id);
  const survivors = imported.filter((p) => survivorIds.has(p.id));
  const alreadyPublished = survivors.filter((p) => p.published).length;
  const toPublish = survivors.filter((p) => !p.published);

  console.log(`\nSurviving imported products: ${survivors.length}`);
  console.log(`  already published: ${alreadyPublished}`);
  console.log(`  to publish now: ${toPublish.length}`);

  const noImages = survivors.filter((p) => !p.images || p.images.length === 0).length;
  const flaggedImages = survivors.filter((p) => p.specs && p.specs._imagesFlagged).length;
  console.log(`  no images at all: ${noImages}`);
  console.log(`  flagged "verify photo": ${flaggedImages}`);

  if (toPublish.length && !dryRun) {
    const ids = toPublish.map((p) => p.id);
    const chunk = 200;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const { error } = await supabase
        .from("products")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in("id", slice);
      if (error) throw error;
    }
    console.log(`\nPublished ${toPublish.length} products.`);
  } else if (dryRun) {
    console.log(`\n(dry-run -- not publishing)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
