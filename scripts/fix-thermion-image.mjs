/**
 * Replace ONLY Pulsar Thermion 2 XQ50 (optics-pro code 76545) photo.
 * Does not touch LRF / PRO / first-gen Thermion variants.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

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
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const IMAGE_URL =
  "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionie-priceli/pulsar/pulsar-thermion-2/pulsar-thermion-2-xq50-optics-pro-1-750x750.jpg";

const outPath = resolve("public/products/pulsar-thermion-2-xq50.jpg");
const publicPath = "/products/pulsar-thermion-2-xq50.jpg";

// ── download ──────────────────────────────────────────────────────────
{
  const res = await fetch(IMAGE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "image/*,*/*",
      Referer: "https://www.optics-pro.com.ua/",
    },
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log("saved", outPath, buf.length);
}

const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) {
  console.log("No Supabase — local file only");
  process.exit(0);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// ── restore accidental overwrites from previous run ───────────────────
const restore = [
  {
    slug: "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-lrf-xq50-pro-thermion-lrf-2-xq50",
    images: [
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581579942-img-0.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581580401-img-1.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581580837-img-2.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581581264-img-3.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581581676-img-4.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581582370-img-5.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-thermion-lrf-2-xq50/1785581582823-img-6.jpg",
    ],
  },
  {
    slug: "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-xq50-pro-76548",
    images: [
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581646614-img-0.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581647350-img-1.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581647757-img-2.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581648291-img-3.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581648699-img-4.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581649371-img-5.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581649896-img-6.jpg",
      "https://wvbqacawttfzrzcqdfai.supabase.co/storage/v1/object/public/product-images/optics-pro-pulsar-76548/1785581650382-img-7.jpg",
    ],
  },
  {
    slug: "pulsar-teploviziynyy-prytsil-pulsar-thermion-xq50-pulsar-thermion-xq50",
    images: [],
  },
];

for (const r of restore) {
  const { error } = await sb
    .from("products")
    .update({ images: r.images })
    .eq("slug", r.slug);
  if (error) console.error("restore", r.slug, error.message);
  else console.log("restored", r.slug);
}

// ── target products only: seed slug + optics-pro 76545 ────────────────
const TARGET_SLUGS = [
  "pulsar-thermion-2-xq50",
  "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-xq50-76545",
];

// Also download extra gallery shots for 76545
const GALLERY = [
  "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionie-priceli/pulsar/pulsar-thermion-2/pulsar-thermion-2-xq50-optics-pro-1-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionie-priceli/pulsar/pulsar-thermion-2/pulsar-thermion-2-optics-pro-2-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionie-priceli/pulsar/pulsar-thermion-2/pulsar-thermion-2-optics-pro-3-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionie-priceli/pulsar/pulsar-thermion-2/pulsar-thermion-2-optics-pro-4-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/teplovizionie-priceli/pulsar/pulsar-thermion-2/pulsar-thermion-2-optics-pro-5-750x750.jpg",
];

// Upload main + gallery to Supabase storage for the real product
async function uploadBuf(path, buf, contentType = "image/jpeg") {
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

const uploaded = [];
for (let i = 0; i < GALLERY.length; i++) {
  try {
    const res = await fetch(GALLERY[i], {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.optics-pro.com.ua/",
      },
    });
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) continue;
    if (i === 0) writeFileSync(outPath, buf); // keep local main
    const storagePath = `thermion-2-xq50-76545/${Date.now()}-img-${i}.jpg`;
    const publicUrl = await uploadBuf(storagePath, buf);
    uploaded.push(publicUrl);
    console.log("uploaded", i, publicUrl.slice(-60));
  } catch (e) {
    console.log("gallery", i, e.message);
  }
}

const finalImages =
  uploaded.length > 0 ? uploaded : [publicPath];

for (const slug of TARGET_SLUGS) {
  const { data: row } = await sb
    .from("products")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) {
    console.log("skip missing", slug);
    continue;
  }
  // seed product uses local path; real 76545 uses storage gallery
  const images =
    slug === "pulsar-thermion-2-xq50" ? [publicPath] : finalImages;
  const { error } = await sb
    .from("products")
    .update({ images })
    .eq("id", row.id);
  if (error) console.error("update", slug, error.message);
  else console.log("updated", slug, "images:", images.length);
}

console.log("done");
