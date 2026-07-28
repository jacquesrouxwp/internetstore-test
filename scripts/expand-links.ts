/**
 * Add more real same-SKU competitor URLs where we know pages exist.
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

const MORE: { slug: string; competitor: string; url: string }[] = [
  {
    slug: "hikmicro-lynx-lc06s",
    competitor: "optics-pro",
    // fallback: try opticstore-only if no page — skip if 404
    url: "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-lc06s",
  },
  {
    slug: "hikmicro-lynx-le10-3-0",
    competitor: "optics-pro",
    url: "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-le10-3-0",
  },
  {
    slug: "hikmicro-lynx-lh35-3-0",
    competitor: "opticstore",
    url: "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-pro-lh35",
  },
  {
    slug: "hikmicro-falcon-fq50l-2-0",
    competitor: "opticstore",
    url: "https://opticstore.com.ua/product/teplovizor-hikmicro-falcon-fq50-20",
  },
  {
    slug: "hikmicro-lynx-lh25-3-0",
    competitor: "profoptica",
    url: "https://profoptica.com.ua/teplovizor-monokulyar-hikmicro-lynx-lh25-20/",
  },
  {
    slug: "hikmicro-lynx-lh19-3-0",
    competitor: "profoptica",
    url: "https://profoptica.com.ua/teplovizionnyy-monokulyar-hikvision-hikmicro-hm-ts03-19xfw-lh19-384288-1500m/",
  },
  {
    slug: "hikmicro-lynx-le15-3-0",
    competitor: "profoptica",
    url: "https://profoptica.com.ua/teplovizor-monokulyar-hikmicro-lynx-pro-le15s/",
  },
  {
    slug: "hikmicro-lynx-lc06s",
    competitor: "opticstore",
    url: "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-lc06s",
  },
];

async function main() {
  const { data: products } = await sb.from("products").select("id, slug, price");
  const { data: competitors } = await sb
    .from("competitors")
    .select("id, slug, name");
  const prod = new Map((products || []).map((p) => [String(p.slug), p]));
  const comp = new Map((competitors || []).map((c) => [String(c.slug), c]));

  for (const rule of MORE) {
    const p = prod.get(rule.slug);
    const c = comp.get(rule.competitor);
    if (!p || !c) {
      console.log("skip missing", rule.slug, rule.competitor);
      continue;
    }
    // Don't use wrong-site URL for optics-pro if it's opticstore domain
    if (
      rule.competitor === "optics-pro" &&
      rule.url.includes("opticstore")
    ) {
      console.log("skip wrong host for optics-pro", rule.slug);
      continue;
    }

    const ex = await extractPriceFromUrl(rule.url);
    console.log(rule.slug, rule.competitor, ex);
    if (!ex.ok) continue;

    const now = new Date().toISOString();
    const { error } = await sb.from("competitor_product_links").upsert(
      {
        product_id: p.id,
        competitor_id: c.id,
        product_url: rule.url,
        is_active: true,
        last_price: ex.price,
        last_error: null,
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "product_id,competitor_id" }
    );
    if (error) console.error(error.message);
    else
      console.log(
        `  saved Δ${ex.price - Number(p.price)} (our ${p.price} vs ${ex.price})`
      );
    await new Promise((r) => setTimeout(r, 350));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
