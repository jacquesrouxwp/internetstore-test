/**
 * Fix Pulsar Merger LRF XP50 only (not DUO NXP50 / XL50).
 * Photos from optics-pro competitor page.
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

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const GALLERY = [
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-1-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-2-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-3-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-4-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-5-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-6-750x750.jpg",
  "https://www.optics-pro.com.ua/image/cache/catalog/tepl.binokli/pulsar/merger/pulsar-merger-lrf-xp50-optics-pro-7-750x750.jpg",
];

const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sb = createClient(url, key, { auth: { persistSession: false } });

async function download(u) {
  const res = await fetch(u, {
    headers: {
      "User-Agent": UA,
      Accept: "image/*",
      Referer: "https://www.optics-pro.com.ua/",
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error("small");
  return buf;
}

async function upload(path, buf) {
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

// 1) restore DUO NXP50 (wrongly overwritten)
{
  const { error } = await sb
    .from("products")
    .update({ images: [] })
    .eq("slug", "pulsar-teploviziynyy-binokl-pulsar-merger-duo-nxp50-aa-0012615");
  if (error) console.log("restore duo", error.message);
  else console.log("restored Merger DUO NXP50 images=[]");
}

// 2) download + upload clean gallery
const localMain = resolve("public/products/pulsar-merger-lrf-xp50.jpg");
const uploaded = [];
for (let i = 0; i < GALLERY.length; i++) {
  try {
    const buf = await download(GALLERY[i]);
    if (i === 0) writeFileSync(localMain, buf);
    const publicUrl = await upload(
      `pulsar-merger-lrf-xp50/v2-${Date.now()}-img-${i}.jpg`,
      buf
    );
    uploaded.push(publicUrl);
    console.log("ok", i, buf.length);
  } catch (e) {
    console.log("skip", i, e.message);
  }
}

if (!uploaded.length) {
  console.error("no uploads");
  process.exit(1);
}

// 3) exact XP50 targets only
const TARGET_SLUGS = [
  "pulsar-merger-lrf-xp50",
  "pulsar-teploviziynyy-binokl-pulsar-merger-lrf-xp50-77462",
];

for (const slug of TARGET_SLUGS) {
  const images =
    slug === "pulsar-merger-lrf-xp50"
      ? ["/products/pulsar-merger-lrf-xp50.jpg", ...uploaded.slice(1)]
      : uploaded;
  const { data, error } = await sb
    .from("products")
    .update({ images })
    .eq("slug", slug)
    .select("id, slug");
  if (error) console.error(slug, error.message);
  else if (!data?.length) console.log("missing", slug);
  else console.log("updated", slug, images.length, "photos");
}

// double-check no duo contamination
const { data: check } = await sb
  .from("products")
  .select("slug, images")
  .or("slug.ilike.%merger%");
for (const p of check || []) {
  const n = Array.isArray(p.images) ? p.images.length : 0;
  const sample = Array.isArray(p.images) ? p.images[0] : null;
  console.log("check", p.slug, "imgs", n, sample ? String(sample).slice(-50) : "—");
}

console.log("done");
