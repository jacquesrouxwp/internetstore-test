/**
 * Seed REAL competitor product page URLs + extract live prices into Supabase.
 * Run: npx tsx scripts/seed-price-links.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { extractPriceFromUrl } from "../src/lib/price-compare/extract-price";

try {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  /* */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Our product slug → real competitor product cards */
const LINKS: {
  productSlug: string;
  competitorSlug: string;
  productUrl: string;
}[] = [
  // Lynx LE10 3.0
  {
    productSlug: "hikmicro-lynx-le10-3-0",
    competitorSlug: "opticstore",
    productUrl:
      "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-le10-3-0",
  },
  {
    productSlug: "hikmicro-lynx-le10-3-0",
    competitorSlug: "profoptica",
    productUrl:
      "https://profoptica.com.ua/teplovizor-monokulyar-hikmicro-lynx-pro-le10s/",
  },
  {
    productSlug: "hikmicro-lynx-le10-3-0",
    competitorSlug: "optics-pro",
    productUrl:
      "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xm30f",
  }, // temporary different model only if needed — prefer skip if wrong
  // Lynx LC06S
  {
    productSlug: "hikmicro-lynx-lc06s",
    competitorSlug: "opticstore",
    productUrl: "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-lc06s",
  },
  {
    productSlug: "hikmicro-lynx-lc06s",
    competitorSlug: "profoptica",
    productUrl:
      "https://profoptica.com.ua/teplovizor-monokulyar-hikmicro-lynx-lc06s/",
  },
  // Lynx LH35 3.0
  {
    productSlug: "hikmicro-lynx-lh35-3-0",
    competitorSlug: "profoptica",
    productUrl:
      "https://profoptica.com.ua/teplovizor-monokulyar-hikmicro-lynx-lh35-30/",
  },
  // Falcon FQ50L 2.0
  {
    productSlug: "hikmicro-falcon-fq50l-2-0",
    competitorSlug: "profoptica",
    productUrl:
      "https://profoptica.com.ua/teplovizor-monokulyar-hikmicro-falcon-fq50-20/",
  },
  // Axion XG30 — closest optics-pro Axion Compact XG35 (different SKU — still demo of pipeline)
  {
    productSlug: "pulsar-axion-xg30",
    competitorSlug: "optics-pro",
    productUrl:
      "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg35",
  },
  {
    productSlug: "pulsar-axion-xg30",
    competitorSlug: "opticstore",
    productUrl:
      "https://opticstore.com.ua/product/teplovizor-pulsar-axion-2-xq35",
  },
];

async function main() {
  // Remove old demo catalog URLs (not product cards)
  const { data: allLinks } = await sb
    .from("competitor_product_links")
    .select("id, product_url");
  for (const l of allLinks || []) {
    const u = String(l.product_url || "");
    if (
      /\/(catalog\/teplovizory|teplovizory\/?|teplovizori\/?)$/i.test(u) ||
      u.endsWith("/teplovizory/") ||
      u.endsWith("/teplovizori/") ||
      u.includes("/catalog/teplovizory") && !u.includes("/product/")
    ) {
      console.log("delete demo catalog link", u);
      await sb.from("competitor_product_links").delete().eq("id", l.id);
    }
  }

  const { data: products } = await sb.from("products").select("id, slug, price");
  const { data: competitors } = await sb
    .from("competitors")
    .select("id, slug, name");
  const prodBySlug = new Map((products || []).map((p) => [String(p.slug), p]));
  const compBySlug = new Map(
    (competitors || []).map((c) => [String(c.slug), c])
  );

  // Skip mismatched axion-xm30f on le10 (I put wrong link) — filter carefully
  const safeLinks = LINKS.filter(
    (l) =>
      !(
        l.productSlug === "hikmicro-lynx-le10-3-0" &&
        l.competitorSlug === "optics-pro"
      )
  );

  for (const rule of safeLinks) {
    const product = prodBySlug.get(rule.productSlug);
    const comp = compBySlug.get(rule.competitorSlug);
    if (!product || !comp) {
      console.log("SKIP missing", rule.productSlug, rule.competitorSlug);
      continue;
    }

    console.log(
      `\n${rule.productSlug} (${product.price} ₴) ← ${comp.name}\n  ${rule.productUrl}`
    );
    const extracted = await extractPriceFromUrl(rule.productUrl);
    console.log("  extract:", extracted);

    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      product_id: product.id,
      competitor_id: comp.id,
      product_url: rule.productUrl,
      is_active: true,
      updated_at: now,
      last_checked_at: now,
    };
    if (extracted.ok) {
      row.last_price = extracted.price;
      row.last_error = null;
      const saving = Number(extracted.price) - Number(product.price);
      console.log(
        saving >= 300
          ? `  → badge OK: ми дешевші на ${saving} ₴`
          : `  → бейдж не покажеться (Δ ${saving} ₴, треба ≥300 на нашу користь)`
      );
    } else {
      row.last_error = extracted.error;
    }

    const { error } = await sb
      .from("competitor_product_links")
      .upsert(row, { onConflict: "product_id,competitor_id" });
    if (error) console.error("  upsert:", error.message);
    else console.log("  saved");

    await new Promise((r) => setTimeout(r, 350));
  }

  const { data: final } = await sb
    .from("competitor_product_links")
    .select(
      "product_url, last_price, last_error, competitors(name), products(slug, price)"
    )
    .eq("is_active", true);
  console.log("\n=== Active links ===");
  for (const l of final || []) {
    const our = (l.products as { price?: number; slug?: string })?.price;
    const slug = (l.products as { slug?: string })?.slug;
    const theirs = l.last_price;
    const delta =
      our != null && theirs != null ? Number(theirs) - Number(our) : null;
    console.log(
      `${slug} | ${(l.competitors as { name?: string })?.name} | our ${our} vs ${theirs} Δ${delta} | ${l.product_url}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
