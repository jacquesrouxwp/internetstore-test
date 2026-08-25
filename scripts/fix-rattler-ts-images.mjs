/**
 * Pull AGM Rattler TS* photos from optics-pro into Supabase Storage
 * and attach to the 4 products that currently have empty images[].
 *
 *   npx tsx scripts/fix-rattler-ts-images.mjs
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

const BASE = "https://www.optics-pro.com.ua/";
const TARGETS = [
  {
    slug: "agm-teploviziynyy-prytsil-agm-rattler-ts35-384-ts35-384",
    donor:
      "ua/teplovizionnie_priceli/teplovizionnye-pricely-agm/teplovizionnyj-pricel-agm-rattler-ts35384",
    key: "ts35384",
  },
  {
    slug: "agm-teploviziynyy-prytsil-agm-rattler-ts25-384-ts25-384",
    donor:
      "ua/teplovizionnie_priceli/teplovizionnye-pricely-agm/teplovizionnyj-pricel-agm-rattler-ts25384",
    key: "ts25384",
  },
  {
    slug: "agm-teploviziynyy-prytsil-agm-rattler-ts25-256-ts25-256",
    donor:
      "ua/teplovizionnie_priceli/teplovizionnye-pricely-agm/teplovizionnyj-pricel-agm-rattler-ts25256",
    key: "ts25256",
  },
  {
    slug: "agm-teploviziynyy-prytsil-agm-rattler-ts19-256-ts19-256",
    donor:
      "ua/teplovizionnie_priceli/teplovizionnye-pricely-agm/teplovizionnyj-pricel-agm-rattler-ts19256",
    key: "ts19256",
  },
];

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

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

// Resolve donor path from index if hardcoded 404s
const index = existsSync("scripts/out/donor-url-index.json")
  ? JSON.parse(readFileSync("scripts/out/donor-url-index.json", "utf8"))
  : [];

function findDonor(key) {
  const k = key.toLowerCase();
  const hits = index.filter(
    (u) =>
      u.toLowerCase().includes(k) && u.toLowerCase().includes("rattler")
  );
  hits.sort((a, b) => a.length - b.length);
  return hits[0] || null;
}

for (const t of TARGETS) {
  let path = t.donor;
  const key = t.key || t.slug.match(/rattler-ts\d+-\d+/i)?.[0] || "";
  const fromIndex = key ? findDonor(key) : null;
  if (fromIndex) path = fromIndex;

  const pageUrl = path.startsWith("http") ? path : BASE + path;
  console.log("\n==", t.slug);
  console.log("donor", pageUrl);

  try {
    const html = await fetchDonorHtml(pageUrl);
    const parsed = parseProductPage(html, pageUrl);
    const imgs = (parsed?.images || []).slice(0, 8);
    if (!imgs.length) {
      console.log("NO IMAGES on donor page");
      continue;
    }
    const uploaded = [];
    for (let i = 0; i < imgs.length; i++) {
      try {
        const buf = await download(imgs[i]);
        if (buf.length < 2000) continue;
        const storagePath = `rattler-${key || t.slug}/${Date.now()}-img-${i}.jpg`;
        const pub = await uploadBuf(storagePath, buf);
        uploaded.push(pub);
        console.log("  +", pub.slice(-70));
      } catch (e) {
        console.log("  skip img", i, e.message);
      }
    }
    if (!uploaded.length) {
      console.log("upload failed");
      continue;
    }
    const { error } = await sb
      .from("products")
      .update({ images: uploaded, updated_at: new Date().toISOString() })
      .eq("slug", t.slug);
    if (error) console.log("DB error", error.message);
    else console.log("OK images=", uploaded.length);
  } catch (e) {
    console.log("FAIL", e.message || e);
  }
}
