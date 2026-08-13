import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

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

const BASE = "https://www.optics-pro.com.ua";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function fix(slug, pagePaths) {
  console.log("\n▸", slug);
  let html = null;
  let pageUrl = null;
  for (const p of pagePaths) {
    const url = p.startsWith("http") ? p : BASE + p;
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html",
          Referer: BASE + "/",
        },
      });
      console.log(" ", r.status, url.slice(-80));
      if (!r.ok) continue;
      html = await r.text();
      pageUrl = url;
      break;
    } catch (e) {
      console.log(" err", e.message);
    }
  }
  if (!html) {
    console.log(" no page");
    return false;
  }

  const found = new Set();
  for (const m of html.matchAll(
    /property=["']og:image["']\s+content=["']([^"']+)["']/gi
  ))
    found.add(m[1]);
  for (const m of html.matchAll(
    /content=["']([^"']+)["']\s+property=["']og:image["']/gi
  ))
    found.add(m[1]);
  for (const m of html.matchAll(
    /(?:src|data-zoom-image|data-src|href)=["']([^"']*\/image\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
  ))
    found.add(m[1]);

  let urls = [...found]
    .map((u) => {
      u = u
        .replace(/&amp;/g, "&")
        .replace(
          /\.pagespeed\.[a-z]+\.[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)/i,
          ".$1"
        );
      if (u.startsWith("//")) u = "https:" + u;
      if (u.startsWith("/")) u = BASE + u;
      return u;
    })
    .filter((u) => !/logo|icon|banner|sprite|favicon|payment/i.test(u));

  urls = urls.filter(
    (u) =>
      (/750x750|500x500|1000|1200|catalog\//i.test(u) ||
        /og:image|image\/catalog/i.test(u)) &&
      !/74x74|40x40|100x100|150x150/i.test(u)
  );
  urls = [...new Set(urls)];
  // prefer 750
  urls.sort((a, b) => {
    const sa = /750x750/.test(a) ? 2 : /500x500/.test(a) ? 1 : 0;
    const sb = /750x750/.test(b) ? 2 : /500x500/.test(b) ? 1 : 0;
    return sb - sa;
  });
  console.log(" images", urls.length, "from", pageUrl);
  urls.slice(0, 8).forEach((u, i) => console.log("  ", i, u.slice(-95)));
  if (!urls.length) return false;

  const uploaded = [];
  for (let i = 0; i < Math.min(urls.length, 7); i++) {
    try {
      const r = await fetch(urls[i], {
        headers: { "User-Agent": UA, Accept: "image/*", Referer: BASE + "/" },
      });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 5000) continue;
      if (i === 0) writeFileSync(resolve(`public/products/${slug}.jpg`), buf);
      const path = `homepage/${slug}/${Date.now()}-${i}.jpg`;
      const { error } = await sb.storage
        .from("product-images")
        .upload(path, buf, { contentType: "image/jpeg", upsert: true });
      if (error) {
        console.log(" up", error.message);
        continue;
      }
      uploaded.push(
        sb.storage.from("product-images").getPublicUrl(path).data.publicUrl
      );
      console.log(" ok", i, buf.length);
    } catch (e) {
      console.log(" e", e.message);
    }
  }
  if (!uploaded.length) return false;
  const { data: prod } = await sb
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!prod) return false;
  await sb.from("products").update({ images: uploaded }).eq("id", prod.id);
  console.log(" ✓ DB", uploaded.length);
  return true;
}

await fix("pulsar-axion-xg30", [
  "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg30",
  "/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg30",
]);

// TH25C — search
{
  const q = "HikMicro Thunder TH25C";
  const su = `${BASE}/index.php?route=product/search&search=${encodeURIComponent(q)}`;
  const r = await fetch(su, { headers: { "User-Agent": UA } });
  const h = await r.text();
  const links = [
    ...h.matchAll(/href=["'](https?:\/\/www\.optics-pro\.com\.ua\/[^"']+)["']/gi),
  ]
    .map((m) => m[1])
    .filter((u) => /thunder|th25/i.test(u) && !u.includes("search"));
  const unique = [...new Set(links)];
  console.log("\nTH25C links", unique.slice(0, 8));
  if (unique.length) {
    await fix(
      "hikmicro-thunder-th25c",
      unique.slice(0, 5).map((u) => u.replace(BASE, ""))
    );
  } else {
    // manufacturer official image fallbacks (common product shots)
    console.log("trying alternate TH25 search");
    const su2 = `${BASE}/index.php?route=product/search&search=${encodeURIComponent("TH25C HikMicro")}`;
    const r2 = await fetch(su2, { headers: { "User-Agent": UA } });
    const h2 = await r2.text();
    const links2 = [
      ...h2.matchAll(
        /href=["'](https?:\/\/www\.optics-pro\.com\.ua\/[^"']*thunder[^"']*)["']/gi
      ),
    ].map((m) => m[1]);
    console.log("alt", [...new Set(links2)].slice(0, 8));
    if (links2.length) {
      await fix(
        "hikmicro-thunder-th25c",
        [...new Set(links2)].slice(0, 4).map((u) => u.replace(BASE, ""))
      );
    }
  }
}

console.log("\ndone");
