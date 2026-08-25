/**
 * 1) Unpublish HikMicro + ThermEye products that have no photos
 * 2) Force-pull Pulsar missing photos from known optics-pro URLs
 *
 *   npx tsx scripts/hide-no-photo-hik-thermeye-fix-pulsar.mjs
 *   npx tsx scripts/hide-no-photo-hik-thermeye-fix-pulsar.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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
const BASE = "https://www.optics-pro.com.ua/";

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

function imgCount(p) {
  return Array.isArray(p.images) ? p.images.filter(Boolean).length : 0;
}

async function fetchAllPublished() {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("products")
      .select("id, slug, sku, name_uk, images, brands(name, slug)")
      .eq("published", true)
      .range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data?.length || data.length < 1000) break;
    from += 1000;
  }
  return all;
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

/** Force donor paths for Pulsar products that auto-match skipped */
const PULSAR_FORCE = {
  "pulsar-teplovizor-pulsar-helion-2-xp50-pro-77431":
    "ua/teplovizori/pulsar/pulsar-helion-2-xp50-pro",
  "pulsar-teplovizor-pulsar-axion-2-xg35-07601":
    "ua/teplovizori/pulsar/teplovizor-pulsar-axion-2-xg35",
};

function isHikOrThermEye(p) {
  // Only the brand itself — not accessories that merely mention HikMicro in the name
  const brand = `${p.brands?.slug || ""} ${p.brands?.name || ""}`.toLowerCase();
  const slug = `${p.slug || ""}`.toLowerCase();
  const isHik =
    brand.includes("hikmicro") ||
    brand.includes("hik-micro") ||
    slug.startsWith("hikmicro-");
  const isTherm =
    brand.includes("thermeye") ||
    brand.includes("thermtec") ||
    brand.includes("therm-eye") ||
    slug.includes("thermeye") ||
    slug.includes("thermtec");
  return isHik || isTherm;
}

async function main() {
  const all = await fetchAllPublished();
  const missing = all.filter((p) => imgCount(p) === 0);

  const hide = missing.filter(isHikOrThermEye);
  const pulsar = missing.filter((p) => {
    const b = `${p.brands?.slug || ""} ${p.brands?.name || ""} ${p.slug}`.toLowerCase();
    return b.includes("pulsar");
  });

  console.log(`Hide (HikMicro/ThermEye, no photos): ${hide.length}`);
  for (const p of hide) console.log(`  - ${p.slug}`);

  console.log(`\nFix Pulsar photos: ${pulsar.length}`);
  for (const p of pulsar) {
    const force = PULSAR_FORCE[p.slug];
    console.log(`  - ${p.slug}${force ? ` → ${force}` : " (no force map)"}`);
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply.");
    return;
  }

  // 1) Hide
  let hidden = 0;
  for (const p of hide) {
    const { error } = await sb
      .from("products")
      .update({
        published: false,
        is_top: false,
        is_hit: false,
        is_new: false,
        is_sale: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (error) console.log("HIDE FAIL", p.slug, error.message);
    else {
      console.log("HIDDEN", p.slug);
      hidden++;
    }
  }

  // 2) Fix Pulsar
  let ok = 0;
  let fail = 0;
  for (const p of pulsar) {
    const path = PULSAR_FORCE[p.slug];
    if (!path) {
      console.log("NOMAP", p.slug);
      fail++;
      continue;
    }
    const pageUrl = path.startsWith("http") ? path : BASE + path;
    console.log(`\n== ${p.slug}`);
    console.log(`donor ${pageUrl}`);
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
  }

  console.log(`\nDone: hidden=${hidden} pulsar_ok=${ok} pulsar_fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
