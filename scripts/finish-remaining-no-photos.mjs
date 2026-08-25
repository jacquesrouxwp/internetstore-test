/**
 * Finish remaining published products without photos:
 * force-pull from known optics-pro URLs, hide the rest.
 *
 *   npx tsx scripts/finish-remaining-no-photos.mjs
 *   npx tsx scripts/finish-remaining-no-photos.mjs --apply
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

const FORCE = {
  "atn-teploviziynyy-prytsil-atn-mars-ltv-640-2-6x-08491-msltv625x":
    "ua/teplovizionnie_priceli/atn-mars-4/teplovizionnyj-pricel-atn-mars-ltv-640-26x",
  "atn-teploviziynyy-prytsil-atn-mars-ltv-320-4-12x-08489-msltv325x":
    "ua/teplovizionnie_priceli/atn-mars-4/teplovizionnyj-pricel-atn-mars-ltv-320-4-12x-",
  "atn-teplovizor-atn-odin-lt-640-3-12x-atn-odin-lt-640-3-12x":
    "ua/teplovizori/atn_ots/teplovizor-atn-odin-lt-640-3-12%D1%85",
  "infiray-teplovizor-infiray-iray-xeye-2-e3-plus-v2-iray-xeye-2-e3-plus-v2":
    "ua/teplovizori/xinfrared/iray-xeye-2-e3-plus-v2",
  "infiray-teplovizor-infiray-iray-xeye-2-e3-max-v2-iray-xeye-2-e3-max-v2":
    "ua/teplovizori/xinfrared/iray-xeye2-e3max-v2",
  "infiray-teplovizor-infiray-iray-xeye-e3n-infiray-iray-e3n":
    "ua/teplovizori/xinfrared/iray-xeye-e3n",
  "agm-adapter-dlia-vstanovlennia-teplovizoriv-na-sholom-udapt-thm-2-aa-0011734":
    "ua/aksessuari_k_pnv/kriplenie-agm/udapt-thm-2",
  "nvectech-shvydkoz-iemnyy-kronshteyn-nvectech-na-hikmicro-agm-nvec-hik-agm-f":
    "ua/aksessuari_k_pnv/kronshtejny/kron-nvec-iray/bystrosemnyj-kronshtejn-nvectech-na-weaver-hikmicro-agm",
};

/** No exact donor match — unpublish for now */
const HIDE_NO_DONOR = [
  "atn-teploviziynyy-prytsil-atn-mars-ltv-640-4-16x-08493-msltv650x",
];

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

async function main() {
  const all = await fetchAllPublished();
  const missing = all.filter((p) => imgCount(p) === 0);
  console.log(`Published missing photos: ${missing.length}`);
  for (const p of missing) {
    const force = FORCE[p.slug];
    const hide = HIDE_NO_DONOR.includes(p.slug);
    console.log(
      `  - ${p.slug} | ${hide ? "HIDE" : force ? `FIX → ${force}` : "???"}`
    );
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply.");
    return;
  }

  let ok = 0;
  let fail = 0;
  let hidden = 0;

  for (const p of missing) {
    if (HIDE_NO_DONOR.includes(p.slug) || !FORCE[p.slug]) {
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
      continue;
    }

    const path = FORCE[p.slug];
    const pageUrl = path.startsWith("http") ? path : BASE + path;
    console.log(`\n== ${p.slug}`);
    console.log(`donor ${pageUrl}`);
    try {
      const html = await fetchDonorHtml(pageUrl);
      const parsed = parseProductPage(html, pageUrl);
      const imgs = (parsed?.images || []).slice(0, 8);
      if (!imgs.length) {
        console.log("  no images — hiding");
        await sb
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
        hidden++;
        continue;
      }
      const uploaded = [];
      const folder = `fix-${squash(p.slug).slice(0, 40)}`;
      for (let i = 0; i < imgs.length; i++) {
        try {
          const buf = await download(imgs[i]);
          if (buf.length < 2000) continue;
          uploaded.push(
            await uploadBuf(`${folder}/${Date.now()}-img-${i}.jpg`, buf)
          );
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

  console.log(`\nDone: ok=${ok} fail=${fail} hidden=${hidden}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
