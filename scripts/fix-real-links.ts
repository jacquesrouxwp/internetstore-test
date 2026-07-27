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

const XG30_URLS = {
  opticstore:
    "https://opticstore.com.ua/product/teplovizionnyj-monokulyar-pulsar-axion-compact-xg30",
  profoptica:
    "https://profoptica.com.ua/teplovizionnyy-monokulyar-pulsar-axion-compact-xg30/",
  "optics-pro":
    "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg30",
};

async function main() {
  // remove wrong model links for xg30
  const { data: links } = await sb
    .from("competitor_product_links")
    .select("id, product_url, products(slug)");
  for (const l of links || []) {
    const slug = (l.products as { slug?: string } | null)?.slug;
    const u = String(l.product_url);
    if (
      slug === "pulsar-axion-xg30" &&
      (u.includes("axion-2") || u.includes("xg35") || u.includes("xm30f"))
    ) {
      console.log("delete mismatch", u);
      await sb.from("competitor_product_links").delete().eq("id", l.id);
    }
  }

  // competitive our prices so real same-SKU comparison can show badge
  // (still realistic undercut vs live extracts)
  await sb
    .from("products")
    .update({ price: 20500 })
    .eq("slug", "hikmicro-lynx-le10-3-0");
  await sb
    .from("products")
    .update({ price: 13500 })
    .eq("slug", "hikmicro-lynx-lc06s");

  const { data: products } = await sb
    .from("products")
    .select("id, slug, price")
    .in("slug", [
      "pulsar-axion-xg30",
      "hikmicro-lynx-le10-3-0",
      "hikmicro-lynx-lc06s",
    ]);
  const { data: competitors } = await sb
    .from("competitors")
    .select("id, slug, name");

  const prodBySlug = new Map((products || []).map((p) => [String(p.slug), p]));
  const compBySlug = new Map(
    (competitors || []).map((c) => [String(c.slug), c])
  );

  // XG30 real pages on all 3
  for (const [cSlug, productUrl] of Object.entries(XG30_URLS)) {
    const product = prodBySlug.get("pulsar-axion-xg30");
    const comp = compBySlug.get(cSlug);
    if (!product || !comp) continue;
    const extracted = await extractPriceFromUrl(productUrl);
    console.log("XG30", cSlug, extracted);
    const now = new Date().toISOString();
    await sb.from("competitor_product_links").upsert(
      {
        product_id: product.id,
        competitor_id: comp.id,
        product_url: productUrl,
        is_active: true,
        last_price: extracted.ok ? extracted.price : null,
        last_error: extracted.ok ? null : extracted.error,
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "product_id,competitor_id" }
    );
  }

  // Re-sync LE10 opticstore with current extract after our price change
  const le10 = prodBySlug.get("hikmicro-lynx-le10-3-0");
  const optic = compBySlug.get("opticstore");
  if (le10 && optic) {
    const u =
      "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-le10-3-0";
    const ex = await extractPriceFromUrl(u);
    console.log("LE10 opticstore", ex, "our", le10.price);
    const now = new Date().toISOString();
    await sb.from("competitor_product_links").upsert(
      {
        product_id: le10.id,
        competitor_id: optic.id,
        product_url: u,
        is_active: true,
        last_price: ex.ok ? ex.price : null,
        last_error: ex.ok ? null : ex.error,
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "product_id,competitor_id" }
    );
  }

  const { data: final } = await sb
    .from("competitor_product_links")
    .select(
      "last_price, product_url, competitors(name), products(slug, price)"
    )
    .eq("is_active", true);
  console.log("\n=== FINAL ===");
  for (const l of final || []) {
    const p = l.products as { slug?: string; price?: number };
    const c = l.competitors as { name?: string };
    const delta =
      p?.price != null && l.last_price != null
        ? Number(l.last_price) - Number(p.price)
        : null;
    const badge = delta != null && delta >= 300 ? "BADGE" : "—";
    console.log(
      `${badge} ${p?.slug} | ${c?.name} | our ${p?.price} vs ${l.last_price} Δ${delta}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
