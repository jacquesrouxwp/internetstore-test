/**
 * Demo-only: download product images from optics-pro.com.ua for local preview.
 * Replace with licensed assets before production.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "products");
const seedPath = path.join(root, "src", "data", "seed.ts");

const BASE = "https://www.optics-pro.com.ua";

/** Our slug -> optics-pro product page path (ua/...) */
const PRODUCT_PAGES = {
  "hikmicro-lynx-le10-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-le10-3-0",
  "hikmicro-lynx-le15-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-le15-30",
  "hikmicro-lynx-lh19-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lh19-30",
  "rix-pocket-k2": "/ua/teplovizori/teplovizor-rix/teplovizor-rix-pocket-k2",
  "rix-titan-t6": "/ua/teplovizori/teplovizor-rix/teplovizor-rix-titan-t6",
  "atn-ots-xlt-160": "/ua/teplovizori/atn_ots/teplovizor-atn-otsxlt-160-2-5-10x",
  "hikmicro-lynx-lh35-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lh35-30",
  "hikmicro-lynx-lc06s":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lc06s",
  "nocpix-vista-h50r":
    "/ua/teplovizori/xinfrared/teplovizor-nocpix-iray-vista-h50r",
  "pard-leopard-640-50-lrf":
    "/ua/teplovizori/teplovizory-pard/teplovizor-pard-leopard-64050-lrf",
  "rix-pocket-k3": "/ua/teplovizori/teplovizor-rix/teplovizor-rix-pocket-k3",
  "rix-titan-t3": "/ua/teplovizori/teplovizor-rix/teplovizor-rix-titan-t3",
  "hikmicro-condor-lrf-cq50l-2-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-condor-lrf-cq50l-2-0",
  "hikmicro-falcon-fq50l-2-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizory-falcon/teplovizor-hikmicro-falcon-fq50l-2-0",
  "hikmicro-lynx-lh25-3-0":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-lh25-30",
  "pulsar-axion-xg30":
    "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xg30",
  "hikmicro-thunder-th35pc-2-0":
    "/ua/teplovizijni-pricili/teplovizijni-pricili-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th35pc-2-0",
  "pulsar-thermion-2-xq50":
    "/ua/teplovizijni-pricili/teplovizijni-pricili-pulsar/teplovizijnij-pricil-pulsar-thermion-2-xq50",
  "hikmicro-habrok-hq35l":
    "/ua/teplovizijni-binokli/teplovizor-hikmicro-habrok-hq35l",
  "pulsar-merger-lrf-xp50":
    "/ua/teplovizijni-binokli/teplovizijnij-binokl-pulsar-merger-lrf-xp50",
  "agm-pvs-14-nl1":
    "/ua/monokulyari_nochnogo_videniya/monokulyary-nochnogo-videniya-agm/pribor-nochnogo-videniya-agm-pvs-14-nl1",
  "pard-nv008s-lrf":
    "/ua/cifrovi-pricili-nichnogo-bachennya/cifrovi-pricili-nichnogo-bachennya-pard/cifrovoj-pricel-pard-nv008s",
  "sytong-ht-60-lrf":
    "/ua/cifrovi-pricili-nichnogo-bachennya/cifrovi-pricili-nichnogo-bachennya-sytong/cifrovoj-pricel-sytong-ht60-lrf",
  "atn-x-sight-4k-pro":
    "/ua/cifrovi-pricili-nichnogo-bachennya/cifrovi-pricili-nichnogo-bachennya-atn/cifrovoj-pricel-atn-x-sight-4k-pro-5-20x",
  "hikmicro-thunder-th25c":
    "/ua/teplovizijni-pricili/teplovizijni-pricili-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th25c",
};

// Alternate paths if primary 404s
const ALT_PAGES = {
  "pulsar-axion-xg30": [
    "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xg30",
    "/ua/teplovizori/pulsar/pulsar-axion-xg30",
  ],
  "hikmicro-thunder-th35pc-2-0": [
    "/ua/teplovizionie-priceli/teplovizijni-pricili-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th35pc",
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-thunder-th35",
  ],
  "pulsar-thermion-2-xq50": [
    "/ua/teplovizionie-priceli/pulsar/teplovizijnij-pricil-pulsar-thermion-2-xq50",
  ],
  "hikmicro-habrok-hq35l": [
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-habrok-hq35l",
  ],
  "rix-storm-s3": [
    "/ua/teplovizori/teplovizor-rix/teplovizor-rix-storm",
  ],
  "armasight-nyx-14-pro": [
    "/ua/monokulyari_nochnogo_videniya/monokulyary-armasight",
  ],
  "pulsar-edge-gs-1x20": [
    "/ua/monokulyari_nochnogo_videniya/monokulyary-pulsar/pribor-nochnogo-videniya-pulsar-edge-gs-1x20",
  ],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

function absolutize(src) {
  if (!src) return null;
  let s = src.replace(/&amp;/g, "&").trim();
  // strip pagespeed suffix junk if present
  s = s.replace(/\.pagespeed\.[a-z]+\.[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)/i, ".$1");
  if (s.startsWith("//")) s = "https:" + s;
  if (s.startsWith("/")) s = BASE + s;
  if (!s.startsWith("http")) s = BASE + "/" + s.replace(/^\.\//, "");
  return s;
}

function pickBestImage(html) {
  const candidates = [];

  // og:image
  const og = html.match(
    /property=["']og:image["']\s+content=["']([^"']+)["']/i
  ) || html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (og?.[1]) candidates.push(og[1]);

  // product thumbs / large images
  const re =
    /(?:src|data-src|data-zoom-image)=["']([^"']*\/image\/(?:cache\/)?catalog\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    candidates.push(m[1]);
  }

  // prefer larger cache sizes or original catalog paths without tiny thumbs
  const scored = candidates
    .map(absolutize)
    .filter(Boolean)
    .filter((u) => !u.includes("logo") && !u.includes("banner"))
    .map((u) => {
      let score = 0;
      if (u.includes("500x") || u.includes("750x") || u.includes("1000x"))
        score += 5;
      if (u.includes("240x") || u.includes("228x")) score += 2;
      if (u.includes("150x") || u.includes("100x")) score -= 3;
      if (u.includes("/cache/")) score += 1;
      if (!u.includes("/cache/")) score += 3;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score);

  // unique
  const seen = new Set();
  const unique = [];
  for (const { u } of scored) {
    if (seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }
  return unique[0] || null;
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: BASE + "/",
    },
  });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`too small ${buf.length} ${url}`);
  // reject gif placeholders
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    throw new Error(`gif placeholder ${url}`);
  }
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function extFromUrl(url) {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return ".png";
  if (clean.endsWith(".webp")) return ".webp";
  return ".jpg";
}

async function resolvePage(slug) {
  const primary = PRODUCT_PAGES[slug];
  const alts = ALT_PAGES[slug] || [];
  const paths = primary ? [primary, ...alts] : alts;
  for (const p of paths) {
    try {
      const html = await fetchText(BASE + p);
      if (html.length < 5000) continue;
      if (/не знайдено|404|Page Not Found/i.test(html) && html.length < 20000)
        continue;
      return { html, path: p };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  // discover product slugs from seed
  const seed = fs.readFileSync(seedPath, "utf8");
  const slugs = [...seed.matchAll(/slug:\s*"([a-z0-9-]+)"/g)]
    .map((m) => m[1])
    .filter(
      (s) =>
        ![
          "hikmicro",
          "rix",
          "pulsar",
          "pard",
          "infiray",
          "atn",
          "agm",
          "flir",
          "thermeye",
          "guide",
          "nvectech",
          "sytong",
          "armasight",
          "atn-ots-hd",
          "conotech",
          "falcon-optic",
          "dahua",
          "dali",
          "lahoux",
          "dipol",
          "konus",
          "seek",
          "leupold",
          "delta",
          "teplovizori",
          "pricili",
          "nasadky",
          "binokli",
          "pnb",
          "pricili-pnb",
          "aksesuary",
        ].includes(s)
    );

  const uniqueSlugs = [...new Set(slugs)];
  const mapping = {};
  const results = [];

  for (const slug of uniqueSlugs) {
    process.stdout.write(`\n→ ${slug} ... `);
    try {
      const page = await resolvePage(slug);
      if (!page) {
        console.log("NO PAGE");
        results.push({ slug, ok: false, reason: "no page" });
        continue;
      }
      const imgUrl = pickBestImage(page.html);
      if (!imgUrl) {
        console.log("NO IMAGE on", page.path);
        results.push({ slug, ok: false, reason: "no image", path: page.path });
        continue;
      }
      const ext = extFromUrl(imgUrl);
      const file = `${slug}${ext}`;
      const dest = path.join(outDir, file);
      const size = await download(imgUrl, dest);
      mapping[slug] = `/products/${file}`;
      console.log(`OK ${size}b ← ${imgUrl.slice(0, 80)}`);
      results.push({ slug, ok: true, file, imgUrl, path: page.path });
    } catch (e) {
      console.log("FAIL", e.message);
      results.push({ slug, ok: false, reason: e.message });
    }
    await sleep(400);
  }

  // patch seed.ts — set images: ["/products/slug.ext"] for matched products
  let next = seed;
  for (const [slug, localPath] of Object.entries(mapping)) {
    // insert or replace images array right after slug line inside product blocks is hard;
    // replace empty images via helper default is images ?? [] — better inject images: [...]
    // Strategy: after each `slug: "X",` that matches, if next lines don't have images, we add via a map at bottom

    // Remove existing images line for this product if any near slug
    // Simpler approach: append PRODUCT_IMAGES map and use in p()
  }

  // Write mapping file and update seed helper to prefer it
  const mapFile = path.join(root, "src", "data", "product-images.json");
  fs.writeFileSync(mapFile, JSON.stringify(mapping, null, 2), "utf8");
  console.log(`\nWrote ${mapFile} (${Object.keys(mapping).length} images)`);

  // Ensure seed.ts uses product-images.json
  if (!seed.includes("product-images.json")) {
    let updated = seed;
    if (!updated.includes('import productImages')) {
      updated = updated.replace(
        'import { estimateDetectionRangeM } from "@/lib/detection-range";',
        `import { estimateDetectionRangeM } from "@/lib/detection-range";\nimport productImages from "@/data/product-images.json";`
      );
    }
    // in p() function, prefer mapped image
    if (!updated.includes("productImages[")) {
      updated = updated.replace(
        "images: partial.images ?? [],",
        `images:\n      partial.images?.length\n        ? partial.images\n        : productImages[partial.slug as keyof typeof productImages]\n          ? [productImages[partial.slug as keyof typeof productImages] as string]\n          : [],`
      );
    }
    // allow resolveJsonModule
    fs.writeFileSync(seedPath, updated, "utf8");
    console.log("Patched seed.ts to use product-images.json");
  } else {
    console.log("seed.ts already references product-images.json");
  }

  // ensure tsconfig resolves json
  const tsconfigPath = path.join(root, "tsconfig.json");
  const ts = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
  ts.compilerOptions = ts.compilerOptions || {};
  if (!ts.compilerOptions.resolveJsonModule) {
    ts.compilerOptions.resolveJsonModule = true;
    fs.writeFileSync(tsconfigPath, JSON.stringify(ts, null, 2), "utf8");
    console.log("Enabled resolveJsonModule in tsconfig.json");
  }

  fs.writeFileSync(
    path.join(outDir, "_fetch-report.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("\nDone. Report: public/products/_fetch-report.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
