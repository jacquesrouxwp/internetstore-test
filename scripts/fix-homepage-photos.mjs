/**
 * Hard-fix homepage rail product photos from optics-pro (original device shots).
 * Targets: is_top / is_hit / is_new / is_sale published products (same as homepage).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://www.optics-pro.com.ua";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Our homepage seed slugs → optics-pro product page paths */
const PRODUCT_PAGES = {
  "hikmicro-lynx-le10-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-le10-3-0",
  "hikmicro-lynx-lh19-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lh19-30",
  "hikmicro-lynx-lh35-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lh35-30",
  "hikmicro-lynx-lh25-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lh25-30",
  "hikmicro-condor-lrf-cq50l-2-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-condor-lrf-cq50l-2-0",
  "hikmicro-habrok-hq35l":
    "/ua/teplovizijni-binokli/teplovizor-hikmicro-habrok-hq35l",
  "hikmicro-thunder-th35pc-2-0":
    "/ua/teplovizijni-pricili/teplovizijni-pricili-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th35pc-2-0",
  "hikmicro-thunder-th25c":
    "/ua/teplovizijni-pricili/teplovizijni-pricili-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th25c",
  "nocpix-vista-h50r":
    "/ua/teplovizori/xinfrared/teplovizor-nocpix-iray-vista-h50r",
  "pulsar-axion-xg30": "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xg30",
  "pulsar-thermion-2-xq50":
    "/ua/teplovizionnie_priceli/pricel_pulsar/pulsar-thermion-2-xq50",
  "pulsar-merger-lrf-xp50":
    "/ua/teplovizionnie_binokli/teplovizionnie_binokli_pulsar_accolade/pulsar-merger-lrf-xp50",
  "agm-pvs-14-nl1":
    "/ua/monokulyari_nochnogo_videniya/monokulyary-nochnogo-videniya-agm/pribor-nochnogo-videniya-agm-pvs-14-nl1",
  "sytong-ht-60-lrf":
    "/ua/cifrovi-pricili-nichnogo-bachennya/cifrovi-pricili-nichnogo-bachennya-sytong/cifrovoj-pricel-sytong-ht60-lrf",
  "armasight-nyx-14-pro":
    "/ua/monokulyari_nochnogo_videniya/monokulyary-armasight/pribor-nochnogo-videniya-armasight-nyx-14-pro",
};

const ALT_PAGES = {
  "hikmicro-habrok-hq35l": [
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-habrok-hq35l",
    "/ua/teplovizijni-binokli/teplovizor-hikmicro-habrok-hq35l",
  ],
  "hikmicro-thunder-th35pc-2-0": [
    "/ua/teplovizijni-pricili/teplovizijni-pricili-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th35pc-2-0",
    "/ua/teplovizionnie_priceli/pricel_hikmicro/teplovizijnij-pricil-hikmicro-thunder-th35pc-2-0",
  ],
  "pulsar-thermion-2-xq50": [
    "/ua/teplovizionnie_priceli/pricel_pulsar/pulsar-thermion-2-xq50",
    "/ua/teplovizijni-pricili/teplovizijni-pricili-pulsar/teplovizijnij-pricil-pulsar-thermion-2-xq50",
  ],
  "pulsar-merger-lrf-xp50": [
    "/ua/teplovizionnie_binokli/teplovizionnie_binokli_pulsar_accolade/pulsar-merger-lrf-xp50",
    "/ua/teplovizijni-binokli/teplovizijnij-binokl-pulsar-merger-lrf-xp50",
  ],
  "pulsar-axion-xg30": [
    "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xg30",
    "/ua/teplovizori/pulsar/pulsar-axion-xg30",
  ],
  "armasight-nyx-14-pro": [
    "/ua/monokulyari_nochnogo_videniya/monokulyary-armasight/pribor-nochnogo-videniya-armasight-nyx-14-pro",
    "/ua/monokulyari_nochnogo_videniya/monokulyary-armasight",
  ],
  "agm-pvs-14-nl1": [
    "/ua/monokulyari_nochnogo_videniya/monokulyary-nochnogo-videniya-agm/pribor-nochnogo-videniya-agm-pvs-14-nl1",
  ],
  "nocpix-vista-h50r": [
    "/ua/teplovizori/xinfrared/teplovizor-nocpix-iray-vista-h50r",
    "/ua/teplovizori/teplovizory-infiray/teplovizor-nocpix-vista-h50r",
  ],
};

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
      )
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function abs(src) {
  if (!src) return null;
  let s = src.replace(/&amp;/g, "&").trim();
  s = s.replace(
    /\.pagespeed\.[a-z]+\.[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)/i,
    ".$1"
  );
  if (s.startsWith("//")) s = "https:" + s;
  if (s.startsWith("/")) s = BASE + s;
  if (!s.startsWith("http")) s = BASE + "/" + s;
  return s;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "uk-UA,uk;q=0.9",
      Referer: BASE + "/",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractGallery(html) {
  const found = [];
  const re =
    /(?:src|data-zoom-image|data-largeimg|href)=["']([^"']*\/image\/[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = abs(m[1]);
    if (!u) continue;
    if (/logo|icon|banner|sprite|payment|nova-poshta|favicon/i.test(u))
      continue;
    if (/pagespeed\.ic/i.test(u)) continue;
    if (!found.includes(u)) found.push(u);
  }
  // Prefer larger sizes
  const score = (u) => {
    let s = 0;
    if (/750x750/.test(u)) s += 5;
    if (/500x500/.test(u)) s += 2;
    if (/1000|1200/.test(u)) s += 6;
    if (/74x74|40x40|228x228/.test(u)) s -= 10;
    return s;
  };
  found.sort((a, b) => score(b) - score(a));
  // Keep only decent sizes
  return found.filter((u) => score(u) >= 2).slice(0, 8);
}

async function download(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/*",
      Referer: BASE + "/",
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`small ${buf.length}`);
  return buf;
}

async function upload(slug, i, buf) {
  const path = `homepage/${slug}/${Date.now()}-${i}.jpg`;
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

async function resolvePage(slug) {
  const candidates = [
    PRODUCT_PAGES[slug],
    ...(ALT_PAGES[slug] || []),
  ].filter(Boolean);
  for (const path of candidates) {
    const url = path.startsWith("http") ? path : BASE + path;
    try {
      const html = await fetchHtml(url);
      // reject category-only pages (no product zoom images)
      const gal = extractGallery(html);
      if (gal.length >= 1) return { url, html, gallery: gal };
      console.log("  empty gallery", url);
    } catch (e) {
      console.log("  404/fail", url, e.message);
    }
  }
  return null;
}

async function loadHomepageProducts() {
  const cols = ["is_top", "is_hit", "is_new", "is_sale"];
  const byId = new Map();
  for (const col of cols) {
    const { data, error } = await sb
      .from("products")
      .select(
        "id, slug, name_uk, images, brands(slug, name), is_top, is_hit, is_new, is_sale"
      )
      .eq("published", true)
      .eq(col, true)
      .order("rating", { ascending: false })
      .limit(8);
    if (error) throw error;
    for (const p of data || []) {
      if (/\brix\b/i.test(`${p.slug} ${p.name_uk}`)) continue;
      if (!byId.has(p.id)) byId.set(p.id, { ...p, rails: [col] });
      else byId.get(p.id).rails.push(col);
    }
  }
  return [...byId.values()];
}

// ── run ─────────────────────────────────────────────────────────────
const products = await loadHomepageProducts();
console.log("Homepage unique products:", products.length);
for (const p of products) {
  console.log(
    ` - [${p.rails.join("+")}] ${p.brands?.name || "?"} | ${p.name_uk} (${p.slug}) imgs=${(p.images || []).length}`
  );
}

const results = [];
const outDir = resolve("public/products");
mkdirSync(outDir, { recursive: true });

for (const p of products) {
  console.log(`\n▸ ${p.name_uk}`);
  const page = await resolvePage(p.slug);
  if (!page) {
    console.log("  ✗ no competitor page / gallery");
    results.push({ slug: p.slug, ok: false, reason: "no_page" });
    continue;
  }
  console.log(`  page: ${page.url}`);
  console.log(`  gallery: ${page.gallery.length}`);
  page.gallery.slice(0, 5).forEach((u, i) => console.log(`   ${i + 1}. ${u.slice(-80)}`));

  const uploaded = [];
  for (let i = 0; i < Math.min(page.gallery.length, 7); i++) {
    try {
      const buf = await download(page.gallery[i]);
      if (i === 0) {
        writeFileSync(resolve(outDir, `${p.slug}.jpg`), buf);
        console.log(`  saved local ${p.slug}.jpg (${buf.length}b)`);
      }
      const pub = await upload(p.slug, i, buf);
      uploaded.push(pub);
    } catch (e) {
      console.log(`  img ${i} fail:`, e.message);
    }
    await sleep(200);
  }

  if (!uploaded.length) {
    results.push({ slug: p.slug, ok: false, reason: "download_fail" });
    continue;
  }

  // Prefer storage URLs for all (CDN). Also keep local path first for short seed slugs
  // so /products/slug.jpg works after deploy too.
  const images = [`/products/${p.slug}.jpg`, ...uploaded.slice(1)];
  // If we have full storage gallery, use that as source of truth (more complete)
  const finalImages = uploaded.length >= 1 ? uploaded : images;

  const { error } = await sb
    .from("products")
    .update({ images: finalImages })
    .eq("id", p.id);
  if (error) {
    console.log("  DB error", error.message);
    results.push({ slug: p.slug, ok: false, reason: error.message });
  } else {
    console.log(`  ✓ updated DB with ${finalImages.length} photos`);
    results.push({
      slug: p.slug,
      ok: true,
      count: finalImages.length,
      source: page.url,
    });
  }
  await sleep(350);
}

console.log("\n════════ SUMMARY ════════");
const ok = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
console.log(`OK: ${ok.length} | FAIL: ${bad.length}`);
for (const r of bad) console.log(`  fail ${r.slug}: ${r.reason}`);
writeFileSync(
  resolve(__dirname, ".homepage-photos-fix-report.json"),
  JSON.stringify({ at: new Date().toISOString(), results }, null, 2)
);
console.log("report → scripts/.homepage-photos-fix-report.json");
