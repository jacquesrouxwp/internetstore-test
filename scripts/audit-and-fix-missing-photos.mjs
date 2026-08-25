/**
 * Audit published products missing photos (optionally by brand),
 * then try to pull gallery from optics-pro.com.ua.
 *
 *   npx tsx scripts/audit-and-fix-missing-photos.mjs --brand pard
 *   npx tsx scripts/audit-and-fix-missing-photos.mjs --brand pard --apply
 *   npx tsx scripts/audit-and-fix-missing-photos.mjs --all --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  fetchDonorHtml,
  parseProductPage,
} from "../src/lib/import/optics-pro-scraper.ts";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(f);
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

const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const brandIdx = process.argv.indexOf("--brand");
const BRAND = brandIdx >= 0 ? String(process.argv[brandIdx + 1] || "").toLowerCase() : "";

const BASE = "https://www.optics-pro.com.ua/";
const INDEX_CACHE = "scripts/out/donor-url-index.json";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function squash(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9]+/g, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllPublished() {
  const all = [];
  let from = 0;
  for (;;) {
    let q = sb
      .from("products")
      .select("id, slug, sku, name_uk, images, brands(name, slug)")
      .eq("published", true)
      .range(from, from + 999);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data || []));
    if (!data?.length || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function imgCount(p) {
  return Array.isArray(p.images) ? p.images.filter(Boolean).length : 0;
}

function loadIndex() {
  if (!existsSync(INDEX_CACHE)) return [];
  return JSON.parse(readFileSync(INDEX_CACHE, "utf8"));
}

/** Find best donor URL for a product */
function findDonorUrl(p, index) {
  const brand = squash(p.brands?.slug || p.brands?.name || "");
  const sku = squash(p.sku);
  const slug = squash(p.slug);
  const name = squash(p.name_uk);

  // Prefer paths that include brand when we know it
  let pool = index;
  if (brand && brand.length >= 3) {
    const branded = index.filter((u) => squash(u).includes(brand));
    if (branded.length) pool = branded;
  }

  const scored = [];
  for (const u of pool) {
    const uq = squash(u);
    let score = 0;
    if (sku && sku.length >= 4 && uq.includes(sku)) score += 50;
    // significant digit tokens from slug/name
    const tokens = (p.slug + " " + (p.name_uk || ""))
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && /\d/.test(t));
    let tokHits = 0;
    for (const t of tokens) {
      if (uq.includes(squash(t))) tokHits++;
    }
    if (tokens.length && tokHits === tokens.length) score += 30 + tokHits;
    else if (tokHits) score += tokHits * 5;

    // model words without digits (leopard, ocelot, pantera…)
    const words = (p.name_uk || "")
      .toLowerCase()
      .replace(/pard|тепловізор|тепловизор|приціл|прицел|нічного|ночного|бачення|видения/gi, " ")
      .split(/[^a-z0-9а-яіїєґ]+/i)
      .map(squash)
      .filter((t) => t.length >= 4 && !/^\d+$/.test(t));
    for (const w of words) {
      if (uq.includes(w)) score += 8;
    }

    if (score > 0) scored.push({ u, score, len: u.length });
  }

  scored.sort((a, b) => b.score - a.score || a.len - b.len);
  if (!scored.length) return null;
  // ambiguous top
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return { url: scored[0].u, ambiguous: true, score: scored[0].score };
  }
  return { url: scored[0].u, ambiguous: false, score: scored[0].score };
}

async function uploadBuf(path, buf) {
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

async function download(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.optics-pro.com.ua/",
      Accept: "image/*,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const all = await fetchAllPublished();
  let missing = all.filter((p) => imgCount(p) === 0);

  if (!ALL && BRAND) {
    missing = missing.filter((p) => {
      const b = `${p.brands?.slug || ""} ${p.brands?.name || ""} ${p.slug}`.toLowerCase();
      return b.includes(BRAND);
    });
  } else if (!ALL && !BRAND) {
    // default: pard
    missing = missing.filter((p) => {
      const b = `${p.brands?.slug || ""} ${p.brands?.name || ""} ${p.slug}`.toLowerCase();
      return b.includes("pard");
    });
  }

  console.log(
    `Published missing photos: ${missing.length}` +
      (BRAND || !ALL ? ` (filter: ${BRAND || "pard"})` : " (all brands)")
  );
  for (const p of missing) {
    console.log(`  - ${p.slug} | ${p.name_uk}`);
  }

  mkdirSync("scripts/out", { recursive: true });
  writeFileSync(
    "scripts/out/missing-photos-audit.json",
    JSON.stringify(
      missing.map((p) => ({
        slug: p.slug,
        name: p.name_uk,
        brand: p.brands?.slug,
        sku: p.sku,
      })),
      null,
      2
    )
  );

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to download photos.");
    return;
  }

  const index = loadIndex();
  if (index.length < 100) {
    console.error("Donor index missing/small — run price sync once to build scripts/out/donor-url-index.json");
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const p of missing) {
    const match = findDonorUrl(p, index);
    if (!match || match.score < 20) {
      console.log(`NOMATCH ${p.slug}`);
      skip++;
      continue;
    }
    if (match.ambiguous && match.score < 40) {
      console.log(`AMBIG ${p.slug} → ${match.url}`);
      skip++;
      continue;
    }
    const pageUrl = match.url.startsWith("http") ? match.url : BASE + match.url;
    console.log(`\n== ${p.slug}`);
    console.log(`donor ${pageUrl} (score=${match.score})`);
    try {
      const html = await fetchDonorHtml(pageUrl);
      const parsed = parseProductPage(html, pageUrl);
      const imgs = (parsed?.images || []).slice(0, 8);
      if (!imgs.length) {
        console.log("  no images on page");
        fail++;
        continue;
      }
      const uploaded = [];
      const folder = `fix-${squash(p.slug).slice(0, 40)}`;
      for (let i = 0; i < imgs.length; i++) {
        try {
          const buf = await download(imgs[i]);
          if (buf.length < 2000) continue;
          const pub = await uploadBuf(
            `${folder}/${Date.now()}-img-${i}.jpg`,
            buf
          );
          uploaded.push(pub);
        } catch (e) {
          console.log("  img skip", i, e.message);
        }
      }
      if (!uploaded.length) {
        fail++;
        continue;
      }
      const { error } = await sb
        .from("products")
        .update({ images: uploaded, updated_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) {
        console.log("  DB", error.message);
        fail++;
      } else {
        console.log(`  OK ${uploaded.length} photos`);
        ok++;
      }
    } catch (e) {
      console.log("  FAIL", e.message || e);
      fail++;
    }
    await sleep(120);
  }

  console.log(`\nDone: ok=${ok} fail=${fail} skip=${skip}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
