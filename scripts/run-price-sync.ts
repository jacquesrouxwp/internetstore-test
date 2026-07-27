/**
 * Run price parser for all active competitor links.
 * npx tsx scripts/run-price-sync.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { extractPriceFromUrl } from "../src/lib/price-compare/extract-price";

const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  process.env[k] = v;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: links, error } = await sb
    .from("competitor_product_links")
    .select(
      "id, product_url, products(slug, price), competitors(name)"
    )
    .eq("is_active", true);
  if (error) throw error;

  console.log(`Syncing ${links?.length || 0} links…\n`);
  let ok = 0;
  let fail = 0;

  for (const link of links || []) {
    const slug = (link.products as { slug?: string } | null)?.slug;
    const our = (link.products as { price?: number } | null)?.price;
    const cname = (link.competitors as { name?: string } | null)?.name;
    const r = await extractPriceFromUrl(String(link.product_url));
    const now = new Date().toISOString();

    if (r.ok) {
      ok++;
      const delta = our != null ? r.price - Number(our) : null;
      console.log(
        `✓ ${slug} | ${cname} | our ${our} → their ${r.price} (Δ${delta}) [${r.method}]`
      );
      await sb
        .from("competitor_product_links")
        .update({
          last_price: r.price,
          last_error: null,
          last_checked_at: now,
          updated_at: now,
        })
        .eq("id", link.id);
    } else {
      fail++;
      console.log(`✗ ${slug} | ${cname} | ${r.error}`);
      await sb
        .from("competitor_product_links")
        .update({
          last_error: r.error,
          last_checked_at: now,
          updated_at: now,
        })
        .eq("id", link.id);
    }
    await new Promise((res) => setTimeout(res, 400));
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
