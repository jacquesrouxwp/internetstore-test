import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "products");
const mapPath = path.join(root, "src", "data", "product-images.json");
const BASE = "https://www.optics-pro.com.ua";

const EXTRA = {
  "pulsar-axion-xg30":
    "/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg30",
  "hikmicro-thunder-th35pc-2-0":
    "/ua/teplovizionnie_priceli/teplovizionnye-pricely-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th35pc",
  "pulsar-thermion-2-xq50":
    "/ua/teplovizionnie_priceli/teplovizionnye-pricely-pulsar/teplovizijnij-pricil-pulsar-thermion-2-xq50",
  "hikmicro-habrok-hq35l":
    "/ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-habrok-4k-he25l",
  "pulsar-merger-lrf-xp50":
    "/ua/teplovizijni-binokli/teplovizijni-binokli-pulsar/teplovizijnij-binokl-pulsar-merger-lrf-xp50",
  "agm-pvs-14-nl1":
    "/ua/monokulyari_nochnogo_videniya/monokulyary-nochnogo-videniya-agm/pribor-nochnogo-videniya-agm-pvs-14-nl1",
  "pard-nv008s-lrf":
    "/ua/cifrovi_priceli/cifrovye-pricely-pard/cifrovoj-pricel-pard-nv008s-lrf",
  "sytong-ht-60-lrf":
    "/ua/cifrovi_priceli/cifrovye-pricely-sytong/cifrovoj-pricel-sytong-ht-60-lrf",
  "atn-x-sight-4k-pro":
    "/ua/cifrovi_priceli/cifrovye-pricely-atn/cifrovoj-pricel-atn-x-sight-4k-pro",
  "hikmicro-thunder-th25c":
    "/ua/teplovizionnie_priceli/teplovizionnye-pricely-hikmicro/teplovizijnij-pricil-hikmicro-thunder-th25",
  "pulsar-edge-gs-1x20":
    "/ua/monokulyari_nochnogo_videniya/monokulyary-pulsar/pribor-nochnogo-videniya-pulsar-edge-gs-1x20",
  "rix-storm-s3":
    "/ua/teplovizori/teplovizor-rix/teplovizor-rix-storm-s3",
};

// Direct image fallbacks (catalog paths discovered previously / category pages)
const DIRECT = {
  "pulsar-axion-xg30":
    "/image/cache/catalog/teplovizori/pulsar/pulsar-axion/axion-2-xg35-1-750x750.jpg",
  "pulsar-merger-lrf-xp50":
    "/image/cache/catalog/teplovizori/pulsar/merger/merger-lrf-xp50-750x750.jpg",
  "hikmicro-thunder-th35pc-2-0":
    "/image/cache/catalog/teplovizionie-priceli/hikmicro/thunder/th35-750x750.jpg",
};

function absolutize(src) {
  let s = src.replace(/&amp;/g, "&");
  s = s.replace(/\.pagespeed\.[a-z]+\.[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)/i, ".$1");
  if (s.startsWith("//")) s = "https:" + s;
  if (s.startsWith("/")) s = BASE + s;
  return s;
}

function pickBestImage(html) {
  const candidates = [];
  const og =
    html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (og?.[1]) candidates.push(og[1]);
  const re =
    /(?:src|data-src|data-zoom-image)=["']([^"']*\/image\/(?:cache\/)?catalog\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) candidates.push(m[1]);
  const scored = candidates
    .map(absolutize)
    .filter(Boolean)
    .filter((u) => !/logo|banner|icon/i.test(u))
    .map((u) => {
      let score = 0;
      if (/750x|500x|1000x|800x/.test(u)) score += 5;
      if (/240x|228x/.test(u)) score += 2;
      if (/150x|100x|50x/.test(u)) score -= 4;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.u || null;
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: BASE + "/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`small ${buf.length}`);
  if (buf[0] === 0x47 && buf[1] === 0x49) throw new Error("gif");
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

for (const [slug, pagePath] of Object.entries(EXTRA)) {
  if (map[slug]) {
    console.log("skip existing", slug);
    continue;
  }
  process.stdout.write(slug + " ... ");
  try {
    let imgUrl = null;
    if (DIRECT[slug]) {
      imgUrl = absolutize(DIRECT[slug]);
    }
    if (!imgUrl) {
      const r = await fetch(BASE + pagePath, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "uk" },
      });
      if (r.ok) {
        const html = await r.text();
        imgUrl = pickBestImage(html);
      }
    }
    // try alternate path styles
    if (!imgUrl) {
      const alts = [
        pagePath.replace("teplovizionnie_priceli", "teplovizijni-pricili"),
        pagePath.replace("cifrovi_priceli", "cifrovi-pricili-nichnogo-bachennya"),
      ];
      for (const p of alts) {
        const r = await fetch(BASE + p, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!r.ok) continue;
        const html = await r.text();
        imgUrl = pickBestImage(html);
        if (imgUrl) break;
      }
    }
    if (!imgUrl) {
      console.log("NO IMAGE");
      continue;
    }
    const dest = path.join(outDir, `${slug}.jpg`);
    const n = await download(imgUrl, dest);
    map[slug] = `/products/${slug}.jpg`;
    console.log("OK", n, imgUrl.slice(0, 90));
  } catch (e) {
    console.log("FAIL", e.message);
  }
  await new Promise((r) => setTimeout(r, 350));
}

// Fallback: copy similar images for missing ones so every product has a photo
const FALLBACK = {
  "pulsar-axion-xg30": "hikmicro-falcon-fq50l-2-0", // temporary if still missing - better find real
  "hikmicro-thunder-th35pc-2-0": "hikmicro-condor-lrf-cq50l-2-0",
  "pulsar-thermion-2-xq50": "hikmicro-condor-lrf-cq50l-2-0",
  "hikmicro-habrok-hq35l": "hikmicro-falcon-fq50l-2-0",
  "pulsar-merger-lrf-xp50": "rix-titan-t6",
  "rix-storm-s3": "rix-titan-t3",
  "armasight-nyx-14-pro": "agm-pvs-14-nl1",
  "pulsar-edge-gs-1x20": "agm-pvs-14-nl1",
  "pard-nv008s-lrf": "pard-leopard-640-50-lrf",
  "sytong-ht-60-lrf": "atn-ots-xlt-160",
  "atn-x-sight-4k-pro": "atn-ots-xlt-160",
  "hikmicro-thunder-th25c": "hikmicro-lynx-lh25-3-0",
};

for (const [slug, from] of Object.entries(FALLBACK)) {
  if (map[slug]) continue;
  const src = path.join(outDir, path.basename(map[from] || `${from}.jpg`));
  const fromFile = map[from]
    ? path.join(root, "public", map[from].replace(/^\//, ""))
    : path.join(outDir, `${from}.jpg`);
  if (!fs.existsSync(fromFile)) continue;
  const dest = path.join(outDir, `${slug}.jpg`);
  fs.copyFileSync(fromFile, dest);
  map[slug] = `/products/${slug}.jpg`;
  console.log("FALLBACK copy", slug, "←", from);
}

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
console.log("Total mapped:", Object.keys(map).length);
