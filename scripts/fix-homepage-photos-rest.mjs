/**
 * Fix remaining homepage products that failed first pass.
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
      )
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const BASE = "https://www.optics-pro.com.ua";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const PAGES = {
  "hikmicro-habrok-hq35l": [
    "/ua/teplovizionnie_binokli/binokli-hikvision/teplovizionnyj-binokl-hikmicro-habrok-hq35l",
    "/teplovizionnie_binokli/binokli-hikvision/teplovizionnyj-binokl-hikmicro-habrok-hq35l",
  ],
  "pulsar-axion-xg30": [
    "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg30",
    "/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg30",
  ],
  "hikmicro-thunder-th35pc-2-0": [
    "/ua/teplovizionnie_nasadki/teplov-nasadki-hikvision/teplovizionnaya-nasadka-hikmicro-thunder-th35pc-20-",
    "/teplovizionnie_nasadki/teplov-nasadki-hikvision/teplovizionnaya-nasadka-hikmicro-thunder-th35pc-20-",
  ],
  "hikmicro-thunder-th25c": [
    "/ua/teplovizionnie_nasadki/teplov-nasadki-hikvision/teplovizionnaya-nasadka-hikmicro-thunder-th25c",
    "/ua/teplovizionnie_priceli/priceli-hikvision/teplovizionnyj-pricel-hikmicro-thunder-th25c",
    "/teplovizionnie_nasadki/teplov-nasadki-hikvision/teplovizionnaya-nasadka-hikmicro-thunder-th25c-20-",
    "/ua/teplovizionnie_nasadki/teplov-nasadki-hikvision/teplovizionnaya-nasadka-hikmicro-thunder-th25c-20-",
  ],
  "sytong-ht-60-lrf": [
    "/ua/priceli_nochnogo_videniya/pricely-nochnogo-videniya-sytong/pricel-nochnogo-videniya-sytong-ht60-lrf",
    "/priceli_nochnogo_videniya/pricely-nochnogo-videniya-sytong/pricel-nochnogo-videniya-sytong-ht60-lrf",
  ],
  "armasight-nyx-14-pro": [
    "/ua/monokulyari_nochnogo_videniya/monokulyary-nochnogo-videniya-agm/pribor-nochnogo-videniya-pvs-14-armasight-n-14-gen-3-plus",
    "/monokulyari_nochnogo_videniya/monokulyary-nochnogo-videniya-agm/pribor-nochnogo-videniya-pvs-14-armasight-n-14-gen-3-plus",
  ],
};

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

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

function extractGallery(html) {
  const found = [];
  const re =
    /(?:src|data-zoom-image|data-largeimg|href)=["']([^"']*\/image\/[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = abs(m[1]);
    if (!u) continue;
    if (/logo|icon|banner|sprite|payment|favicon|pagespeed\.ic/i.test(u))
      continue;
    if (!found.includes(u)) found.push(u);
  }
  const score = (u) => {
    let s = 0;
    if (/750x750/.test(u)) s += 5;
    if (/500x500/.test(u)) s += 2;
    if (/74x74|40x40/.test(u)) s -= 10;
    return s;
  };
  return found
    .sort((a, b) => score(b) - score(a))
    .filter((u) => score(u) >= 2)
    .slice(0, 8);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "uk-UA,uk;q=0.9",
      Referer: BASE + "/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*", Referer: BASE + "/" },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error("small");
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

for (const [slug, paths] of Object.entries(PAGES)) {
  console.log("\n▸", slug);
  const { data: prod } = await sb
    .from("products")
    .select("id, slug, name_uk, images")
    .eq("slug", slug)
    .maybeSingle();
  if (!prod) {
    console.log("  not in DB");
    continue;
  }

  let gallery = [];
  let pageUrl = null;
  for (const p of paths) {
    const url = p.startsWith("http") ? p : BASE + p;
    try {
      const html = await fetchHtml(url);
      gallery = extractGallery(html);
      if (gallery.length) {
        pageUrl = url;
        break;
      }
      console.log("  empty", url);
    } catch (e) {
      console.log("  fail", url, e.message);
    }
  }
  if (!gallery.length) {
    console.log("  ✗ still no gallery");
    continue;
  }
  console.log("  page", pageUrl);
  console.log("  imgs", gallery.length);

  const uploaded = [];
  for (let i = 0; i < Math.min(gallery.length, 7); i++) {
    try {
      const buf = await download(gallery[i]);
      if (i === 0) {
        writeFileSync(resolve(`public/products/${slug}.jpg`), buf);
        console.log("  local", buf.length);
      }
      uploaded.push(await upload(slug, i, buf));
    } catch (e) {
      console.log("  dl", i, e.message);
    }
  }
  if (!uploaded.length) continue;
  const { error } = await sb
    .from("products")
    .update({ images: uploaded })
    .eq("id", prod.id);
  if (error) console.log("  db", error.message);
  else console.log("  ✓", uploaded.length, "photos");
}

console.log("\ndone");
