/**
 * Sync stock (all in stock) + prices from optics-pro.com.ua
 *
 *   npx tsx scripts/sync-prices-stock-from-optics-pro.mjs
 *   npx tsx scripts/sync-prices-stock-from-optics-pro.mjs --dry
 *   npx tsx scripts/sync-prices-stock-from-optics-pro.mjs --limit 100
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  discoverProductUrls,
  fetchDonorHtml,
  parseProductPage,
} from "../src/lib/import/optics-pro-scraper.ts";
import {
  DONOR_ROOT_PATHS,
  mapDonorCategory,
} from "../src/lib/import/optics-pro-categories.ts";
import { extractPriceFromUrl } from "../src/lib/price-compare/extract-price.ts";

const text = readFileSync(".env.local", "utf8");
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

const DRY = process.argv.includes("--dry");
const LIMIT_IDX = process.argv.indexOf("--limit");
const LIMIT =
  LIMIT_IDX >= 0 ? Math.max(1, Number(process.argv[LIMIT_IDX + 1]) || 0) : 0;
const CONCURRENCY = 5;
const BASE = "https://www.optics-pro.com.ua/";
const INDEX_CACHE = "scripts/out/donor-url-index.json";
const REPORT = "scripts/out/price-sync-report.json";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const CATEGORY_PREFIXES = [
  "тепловізор",
  "тепловизор",
  "тепловізійний приціл",
  "тепловизионный прицел",
  "тепловізійний бінокль",
  "тепловизионный бинокль",
  "приціл нічного бачення",
  "прицел ночного видения",
  "монокуляр нічного бачення",
  "монокуляр ночного видения",
  "нічна насадка",
  "ночная насадка",
  "насадка",
  "приціл",
  "прицел",
  "монокуляр",
  "бінокль",
  "бинокль",
];

function searchQuery(name) {
  let s = String(name || "").toLowerCase().trim();
  for (const p of CATEGORY_PREFIXES) {
    if (s.startsWith(p)) {
      s = s.slice(p.length);
      break;
    }
  }
  return s.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/g, " ")
    .trim();
}

function squash(s) {
  return norm(s).replace(/\s+/g, "");
}

function scoreCandidate(ourName, ourBrand, candName) {
  const candSq = squash(candName);
  const brandOk = ourBrand
    ? candSq.includes(squash(ourBrand)) ||
      squash(ourName).includes(squash(ourBrand)) ||
      squash(ourBrand).includes("nocpix") ||
      squash(ourBrand) === "infiray"
    : true;
  if (!brandOk) return { score: 0, reason: "brand mismatch" };

  const ourSq = squash(searchQuery(ourName));
  if (ourSq && candSq.includes(ourSq)) {
    return { score: 1, reason: "ok" };
  }

  // Fallback: all digit-bearing tokens + long tokens must appear
  const tokens = norm(searchQuery(ourName))
    .split(" ")
    .filter((t) => t.length >= 2)
    .filter((t) => /\d/.test(t) || t.length >= 4);
  const digitTokens = tokens.filter((t) => /\d/.test(t));
  if (digitTokens.length >= 1 && digitTokens.every((t) => candSq.includes(squash(t)))) {
    const extras = tokens.filter((t) => !/\d/.test(t));
    if (extras.every((t) => candSq.includes(squash(t)))) {
      return { score: 0.8, reason: "token-fallback" };
    }
  }
  return { score: 0, reason: `no model (${ourSq})` };
}

function findMatch(nameUk, brand, ourCategory, sku, index) {
  const ourLen = squash(searchQuery(nameUk)).length;
  const skuSq = sku ? squash(sku) : "";

  function collect(requireCat) {
    const cands = [];
    for (const rel of index) {
      if (requireCat && ourCategory) {
        const mapped = mapDonorCategory(rel);
        if (!mapped || mapped.ourSlug !== ourCategory) continue;
      }
      const slugPart = rel.split("/").pop() || rel;
      const pathSq = squash(rel);

      if (skuSq && skuSq.length >= 4 && pathSq.includes(skuSq)) {
        cands.push({
          url: rel,
          score: 1.2,
          reason: "sku",
          extra: Math.abs(squash(slugPart).length - ourLen),
        });
        continue;
      }

      const { score, reason } = scoreCandidate(nameUk, brand, slugPart);
      if (score > 0) {
        cands.push({
          url: rel,
          score,
          reason,
          extra: Math.abs(squash(slugPart).length - ourLen),
        });
      }
    }
    cands.sort((a, b) => b.score - a.score || a.extra - b.extra);
    return cands;
  }

  let cands = collect(true);
  if (!cands.length) cands = collect(false);
  const best = cands[0];
  if (!best) return null;
  if (
    cands.length > 1 &&
    cands[1].score === best.score &&
    cands[1].extra === best.extra
  ) {
    return { ...best, ambiguous: true };
  }
  return best;
}

async function buildUrlIndex() {
  if (existsSync(INDEX_CACHE)) {
    const cached = JSON.parse(readFileSync(INDEX_CACHE, "utf8"));
    if (Array.isArray(cached) && cached.length > 500) {
      console.log(`index cache: ${cached.length}`);
      return cached;
    }
  }
  const urls = new Set();
  for (const root of DONOR_ROOT_PATHS) {
    try {
      const found = await discoverProductUrls(root, {
        delayMs: 100,
        onPage: (page, n, total) => {
          process.stdout.write(`\r  ${root} p${page} +${n} total=${total}   `);
        },
      });
      found.forEach((u) => urls.add(u));
      process.stdout.write("\n");
    } catch (e) {
      console.warn("root fail", root, e.message || e);
    }
  }
  const list = Array.from(urls);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync(INDEX_CACHE, JSON.stringify(list));
  console.log(`index built: ${list.length}`);
  return list;
}

async function fetchAllProducts() {
  const pageSize = 1000;
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("products")
      .select(
        "id, slug, name_uk, price, stock, sku, published, brands(name, slug), categories(slug)"
      )
      .eq("published", true)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, () =>
      worker()
    )
  );
  return results;
}

async function setAllInStock() {
  if (DRY) {
    console.log("[dry] set stock>=5 for all published");
    return;
  }
  // bulk: fetch ids with stock < 5 and update
  const { data: low } = await sb
    .from("products")
    .select("id, stock")
    .eq("published", true)
    .lt("stock", 5);
  let n = 0;
  for (const p of low || []) {
    const { error } = await sb
      .from("products")
      .update({ stock: 5 })
      .eq("id", p.id);
    if (!error) n++;
  }
  console.log(`Stock: set stock=5 for ${n} products (was <5)`);
}

async function applyCompetitorLinks() {
  const { data: links } = await sb
    .from("competitor_product_links")
    .select(
      "id, product_url, last_price, product_id, products(id, slug, price), competitors(slug)"
    )
    .eq("is_active", true);

  // Prefer optics-pro; if multiple links, optics-pro wins
  const byProduct = new Map();
  for (const link of links || []) {
    const pid = link.product_id || link.products?.id;
    if (!pid) continue;
    const isOp = (link.competitors?.slug || "") === "optics-pro";
    const prev = byProduct.get(pid);
    if (!prev || (isOp && !prev.isOp)) {
      byProduct.set(pid, { link, isOp });
    }
  }

  let applied = 0;
  for (const { link, isOp } of byProduct.values()) {
    if (!isOp) continue; // only optics-pro as source of truth per user
    let price = Number(link.last_price) || 0;
    if (!price || price < 100) {
      const r = await extractPriceFromUrl(String(link.product_url));
      if (r.ok) {
        price = r.price;
        if (!DRY) {
          await sb
            .from("competitor_product_links")
            .update({
              last_price: price,
              last_error: null,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", link.id);
        }
      }
    }
    const pid = link.product_id || link.products?.id;
    const our = Number(link.products?.price) || 0;
    if (!pid || !price || price < 100) continue;
    if (Math.abs(our - price) < 1) continue;
    console.log(`  link ${link.products?.slug}: ${our} → ${price}`);
    if (!DRY) {
      const { error } = await sb.from("products").update({ price }).eq("id", pid);
      if (!error) applied++;
    } else applied++;
    await sleep(150);
  }
  return applied;
}

async function syncFromDonor(products, index) {
  let list = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    nameUk: p.name_uk,
    price: Number(p.price) || 0,
    brand: p.brands?.name || p.brands?.slug || null,
    category: p.categories?.slug || null,
    sku: p.sku || null,
  }));

  // zeros and cheap first
  list.sort((a, b) => a.price - b.price);
  if (LIMIT > 0) list = list.slice(0, LIMIT);

  console.log(`Donor sync candidates: ${list.length}`);
  const report = { updated: [], skipped: [], failed: [], unmatched: [] };

  await mapPool(list, CONCURRENCY, async (p, idx) => {
    const match = findMatch(p.nameUk, p.brand, p.category, p.sku, index);
    if (!match || match.ambiguous) {
      report.unmatched.push({
        slug: p.slug,
        reason: match?.ambiguous ? "ambiguous" : "no-match",
      });
      return;
    }
    const url = match.url.startsWith("http") ? match.url : BASE + match.url;
    try {
      const html = await fetchDonorHtml(url);
      const parsed = parseProductPage(html, url);
      let donorPrice = parsed?.price ?? null;
      if (!donorPrice) {
        const r = await extractPriceFromUrl(url);
        if (r.ok) donorPrice = r.price;
      }
      if (!donorPrice || donorPrice < 100) {
        report.failed.push({ slug: p.slug, url, error: "no-price" });
        return;
      }
      if (Math.abs(p.price - donorPrice) < 1) {
        report.skipped.push({ slug: p.slug, price: p.price });
        return;
      }
      console.log(
        `[${idx + 1}/${list.length}] ${p.slug}: ${p.price} → ${donorPrice}`
      );
      if (!DRY) {
        const { error } = await sb
          .from("products")
          .update({ price: donorPrice })
          .eq("id", p.id);
        if (error) {
          report.failed.push({ slug: p.slug, url, error: error.message });
          return;
        }
      }
      report.updated.push({
        slug: p.slug,
        from: p.price,
        to: donorPrice,
        url,
      });
    } catch (e) {
      report.failed.push({ slug: p.slug, url, error: e.message || String(e) });
    }
    await sleep(60);
  });

  return report;
}

async function main() {
  console.log(DRY ? "DRY RUN" : "LIVE UPDATE");
  const products = await fetchAllProducts();
  console.log(`Published: ${products.length}`);

  await setAllInStock();

  console.log("\nApplying optics-pro competitor links…");
  const fromLinks = await applyCompetitorLinks();
  console.log(`From links: ${fromLinks}`);

  console.log("\nDonor index…");
  const index = await buildUrlIndex();

  // refresh product prices after link updates
  const products2 = await fetchAllProducts();
  const report = await syncFromDonor(products2, index);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log("updated", report.updated.length);
  console.log("skipped", report.skipped.length);
  console.log("unmatched", report.unmatched.length);
  console.log("failed", report.failed.length);

  const { count: oos } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .lte("stock", 0);
  const { count: zero } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .eq("price", 0);

  const { data: hik } = await sb
    .from("products")
    .select("slug,name_uk,price,stock")
    .eq("published", true)
    .or(
      "slug.eq.hikmicro-lynx-lh19-3-0,slug.eq.hikmicro-lynx-le10-3-0,slug.eq.hikmicro-lynx-lh25-3-0,slug.eq.hikmicro-condor-lrf-cq50l-2-0"
    );
  console.log({ oos, zeroPrice: zero });
  console.log("key products", hik);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
