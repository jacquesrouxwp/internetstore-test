/**
 * Hard audit: homepage rails (top/hit/new/sale × 8) — unique products + photo health.
 * Optionally --fix to pull competitor (optics-pro) product photos.
 *
 * Usage:
 *   node scripts/audit-homepage-photos.mjs
 *   node scripts/audit-homepage-photos.mjs --fix
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

const FIX = process.argv.includes("--fix");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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

const FLAGS = [
  { flag: "top", col: "is_top", label: "Топ / bestsellers" },
  { flag: "hit", col: "is_hit", label: "Хіти" },
  { flag: "new", col: "is_new", label: "Новинки" },
  { flag: "sale", col: "is_sale", label: "Акції" },
];

async function loadRail(col) {
  const { data, error } = await sb
    .from("products")
    .select(
      "id, slug, name_uk, name_ru, sku, images, brand_id, is_top, is_hit, is_new, is_sale, published, brands(slug, name)"
    )
    .eq("published", true)
    .eq(col, true)
    .order("rating", { ascending: false })
    .limit(8);
  if (error) throw error;
  return data || [];
}

function isRix(p) {
  const blob = [p.slug, p.name_uk, p.name_ru, p.brands?.slug, p.brands?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\brix\b/.test(blob);
}

function imageHealth(images) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const issues = [];
  if (!list.length) issues.push("NO_IMAGES");
  for (const u of list) {
    const s = String(u);
    if (s.includes("placeholder") || s.includes("no-image"))
      issues.push("PLACEHOLDER");
    if (s.endsWith(".svg")) issues.push("SVG_NOT_PHOTO");
    // local demo path without storage often means old seed photo
    if (s.startsWith("/products/") && !s.includes("supabase")) {
      // not always bad — seed may be ok after fix
    }
  }
  return { count: list.length, primary: list[0] || null, issues, list };
}

async function headOk(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    // some CDNs block HEAD
    if (res.ok) return { ok: true, status: res.status, len: res.headers.get("content-length") };
    const g = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Range: "bytes=0-1023" },
    });
    return { ok: g.ok || g.status === 206, status: g.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Search optics-pro for product by model keywords */
async function searchOpticsPro(nameUk, brandSlug) {
  // Build search query from product name — strip generic words
  let q = String(nameUk || "")
    .replace(/Тепловізійний|Тепловізор|Приціл|Монокуляр|Бінокль|прилад|нічного|бачення/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Prefer model tokens
  const tokens = q.split(" ").filter((t) => t.length > 2);
  // Keep brand + distinctive model parts
  const query = tokens.slice(0, 6).join(" ");
  if (query.length < 4) return null;

  const searchUrl = `https://www.optics-pro.com.ua/index.php?route=product/search&search=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "uk-UA,uk;q=0.9",
      },
    });
    if (!res.ok) return { query, error: res.status };
    const html = await res.text();
    // product links
    const links = [
      ...html.matchAll(
        /href="(https?:\/\/www\.optics-pro\.com\.ua\/(?:ua\/)?[^"]+)"/gi
      ),
    ]
      .map((m) => m[1])
      .filter(
        (u) =>
          !u.includes("search") &&
          !u.includes("route=") &&
          !u.includes("#") &&
          /teploviz|pricel|binokl|monokul|pnb|prytsil|priceli|binokli/i.test(u)
      );
    const unique = [...new Set(links)].slice(0, 8);

    // Also extract product card images from search results
    const cardImgs = [
      ...html.matchAll(
        /src="(https?:\/\/www\.optics-pro\.com\.ua\/image\/cache\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
      ),
    ]
      .map((m) => m[1])
      .filter((u) => !/logo|banner|icon|sprite/i.test(u) && /750x750|500x500|228x228/.test(u));

    return { query, searchUrl, productLinks: unique, cardImages: [...new Set(cardImgs)].slice(0, 12) };
  } catch (e) {
    return { query, error: e.message };
  }
}

async function scrapeProductGallery(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        Referer: "https://www.optics-pro.com.ua/",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const imgs = [
      ...html.matchAll(
        /(?:src|data-zoom-image|href)=["']([^"']*\/image\/[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
      ),
    ]
      .map((m) => {
        let u = m[1];
        if (u.startsWith("//")) u = "https:" + u;
        if (u.startsWith("/")) u = "https://www.optics-pro.com.ua" + u;
        return u;
      })
      .filter(
        (u) =>
          /750x750|1000|1200|original/i.test(u) &&
          !/logo|icon|banner|sprite|pagespeed\.ic/i.test(u)
      );
    // unique prefer 750
    const uniq = [];
    for (const u of imgs) {
      if (!uniq.includes(u)) uniq.push(u);
    }
    return uniq.slice(0, 8);
  } catch {
    return [];
  }
}

async function downloadBuf(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/*",
      Referer: "https://www.optics-pro.com.ua/",
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 6000) throw new Error("small");
  return buf;
}

async function uploadToStorage(slug, i, buf) {
  const path = `homepage-fix/${slug}/${Date.now()}-img-${i}.jpg`;
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

// ── main ────────────────────────────────────────────────────────────
const rails = {};
const byId = new Map();

for (const f of FLAGS) {
  const rows = (await loadRail(f.col)).filter((p) => !isRix(p));
  rails[f.flag] = rows;
  for (const p of rows) {
    if (!byId.has(p.id)) byId.set(p.id, { ...p, rails: [f.flag] });
    else byId.get(p.id).rails.push(f.flag);
  }
}

const unique = [...byId.values()];
console.log("═══════════════════════════════════════════════");
console.log(" HOMEPAGE PHOTO HARD AUDIT");
console.log("═══════════════════════════════════════════════");
console.log(`Rails: top/hit/new/sale × up to 8 each`);
for (const f of FLAGS) {
  console.log(`  ${f.label}: ${rails[f.flag].length} products`);
}
console.log(`Unique products on homepage: ${unique.length}`);
console.log("");

const report = [];

for (const p of unique) {
  const brand = p.brands?.name || p.brands?.slug || "?";
  const health = imageHealth(p.images);
  let primaryOk = null;
  if (health.primary) {
    const abs = health.primary.startsWith("http")
      ? health.primary
      : `https://pro-optics.com.ua${health.primary}`;
    primaryOk = await headOk(abs);
    // also try local public if path
  }

  // Heuristic suspicion: missing images, broken primary, only 1 tiny path, or stock placeholder names
  const suspicious = [...health.issues];
  if (primaryOk && !primaryOk.ok) suspicious.push("PRIMARY_BROKEN");
  if (health.count === 0) suspicious.push("EMPTY");
  // local seed paths for products that also exist as optics-pro imports often mean wrong generic photo
  if (
    health.primary &&
    String(health.primary).startsWith("/products/") &&
    p.slug.length > 40
  ) {
    suspicious.push("LONG_SLUG_LOCAL_PATH");
  }

  const row = {
    id: p.id,
    slug: p.slug,
    name: p.name_uk,
    brand,
    rails: p.rails.join("+"),
    imageCount: health.count,
    primary: health.primary,
    primaryOk: primaryOk?.ok ?? null,
    issues: suspicious,
    needsFix: suspicious.length > 0 || health.count < 1,
  };
  report.push(row);
}

// Print table
console.log("── ALL UNIQUE ─────────────────────────────────");
for (const r of report) {
  const flag = r.needsFix ? "⚠" : "✓";
  console.log(
    `${flag} [${r.rails}] ${r.brand} | ${r.name}\n` +
      `   slug: ${r.slug}\n` +
      `   imgs: ${r.imageCount} | primary: ${r.primary || "—"}\n` +
      `   issues: ${r.issues.length ? r.issues.join(", ") : "ok"}`
  );
}

const need = report.filter((r) => r.needsFix || r.imageCount < 2);
console.log("\n── NEEDS ATTENTION ──────────────────────────");
console.log(`Count: ${need.length} / ${report.length}`);

// For ALL unique products, try to find competitor photo match score
console.log("\n── COMPETITOR LOOKUP (optics-pro) ───────────");
const fixPlan = [];

for (const p of unique) {
  const name = p.name_uk || p.name_ru || p.slug;
  const brandSlug = p.brands?.slug || "";
  process.stdout.write(`… ${name.slice(0, 50)} `);
  const found = await searchOpticsPro(name, brandSlug);
  if (!found || found.error) {
    console.log("search fail", found?.error || "");
    fixPlan.push({ product: p, status: "search_fail", found });
    continue;
  }
  // Pick best product link — prefer URL containing brand + model tokens
  const nameTokens = name
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ\s\-]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/тепло|приціл|бінок|монокул|прилад|бачен/i.test(t));

  let bestLink = found.productLinks[0] || null;
  let bestScore = -1;
  for (const link of found.productLinks) {
    const L = link.toLowerCase();
    let sc = 0;
    for (const t of nameTokens) if (L.includes(t.toLowerCase())) sc += 2;
    if (brandSlug && L.includes(brandSlug)) sc += 3;
    // penalize wrong family
    if (/xl50/.test(L) && !/xl50/.test(name.toLowerCase())) sc -= 5;
    if (/xq50/.test(L) && /xp50/.test(name.toLowerCase())) sc -= 3;
    if (sc > bestScore) {
      bestScore = sc;
      bestLink = link;
    }
  }

  let gallery = [];
  if (bestLink && bestScore >= 2) {
    gallery = await scrapeProductGallery(bestLink);
  }
  // fallback: card images from search
  if (!gallery.length && found.cardImages?.length) {
    gallery = found.cardImages.filter((u) => /750x750/.test(u)).slice(0, 6);
  }

  console.log(
    `→ score=${bestScore} gallery=${gallery.length} link=${bestLink ? bestLink.slice(0, 70) : "—"}`
  );

  fixPlan.push({
    product: p,
    status: gallery.length ? "has_gallery" : "no_gallery",
    bestLink,
    bestScore,
    gallery,
    query: found.query,
  });

  // polite delay
  await new Promise((r) => setTimeout(r, 400));
}

// Apply fixes if requested
if (FIX) {
  console.log("\n── APPLYING FIXES ───────────────────────────");
  let fixed = 0;
  for (const plan of fixPlan) {
    if (plan.status !== "has_gallery" || plan.bestScore < 2) {
      console.log("skip", plan.product.slug, plan.status, "score", plan.bestScore);
      continue;
    }
    // Always refresh homepage products when we have a confident match
    // (user asked for competitor-correct original device photos)
    const uploaded = [];
    for (let i = 0; i < Math.min(plan.gallery.length, 7); i++) {
      try {
        const buf = await downloadBuf(plan.gallery[i]);
        // also write main local for seed-style slugs
        if (i === 0 && plan.product.slug.length < 50) {
          try {
            writeFileSync(
              resolve(`public/products/${plan.product.slug}.jpg`),
              buf
            );
          } catch {
            /* ignore path issues */
          }
        }
        const publicUrl = await uploadToStorage(plan.product.slug, i, buf);
        uploaded.push(publicUrl);
      } catch (e) {
        console.log("  img fail", i, e.message);
      }
    }
    if (!uploaded.length) {
      console.log("no upload", plan.product.slug);
      continue;
    }
    const { error } = await sb
      .from("products")
      .update({ images: uploaded })
      .eq("id", plan.product.id);
    if (error) console.log("db fail", plan.product.slug, error.message);
    else {
      fixed++;
      console.log(
        `✓ fixed ${plan.product.name_uk} (${uploaded.length} photos) from ${plan.bestLink}`
      );
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`\nFixed ${fixed} products`);
} else {
  console.log("\n(dry-run) Run with --fix to replace photos from optics-pro");
}

// summary JSON
const out = {
  generatedAt: new Date().toISOString(),
  rails: Object.fromEntries(
    FLAGS.map((f) => [f.flag, rails[f.flag].map((p) => p.slug)])
  ),
  uniqueCount: unique.length,
  report,
  fixPlan: fixPlan.map((p) => ({
    slug: p.product.slug,
    name: p.product.name_uk,
    status: p.status,
    bestScore: p.bestScore,
    bestLink: p.bestLink,
    galleryCount: p.gallery?.length || 0,
    query: p.query,
  })),
};
writeFileSync(
  resolve("scripts/.homepage-photo-audit.json"),
  JSON.stringify(out, null, 2)
);
console.log("\nSaved scripts/.homepage-photo-audit.json");
