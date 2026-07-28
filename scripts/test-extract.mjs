/**
 * Live test of price extraction on real competitor product pages.
 * Run: node scripts/test-extract.mjs
 */

// Mirror production extract-price.ts (keep in sync when changing strategies)
function parseNumber(raw) {
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/\s/g, "").replace(/&nbsp;/gi, "").replace(/\u00a0/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{2}$/.test(s)) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 50_000_000) return null;
  return Math.round(n);
}

function fromJsonLd(html) {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const prices = [];
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : [data];
      const flat = [];
      for (const n of nodes) {
        flat.push(n);
        if (n && typeof n === "object" && n["@graph"]) flat.push(...n["@graph"]);
      }
      for (const node of flat) {
        if (!node || typeof node !== "object") continue;
        const type = node["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (!types.some((t) => String(t).toLowerCase().includes("product")))
          continue;
        const offers = node.offers;
        const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
        for (const off of offerList) {
          if (!off || typeof off !== "object") continue;
          if (off.price != null) {
            const n =
              typeof off.price === "number"
                ? Math.round(off.price)
                : parseNumber(String(off.price));
            if (n) prices.push({ n, method: "json-ld" });
          }
          if (off.lowPrice != null) {
            const n = parseNumber(String(off.lowPrice));
            if (n) prices.push({ n, method: "json-ld-low" });
          }
        }
        if (node.price != null) {
          const n =
            typeof node.price === "number"
              ? Math.round(node.price)
              : parseNumber(String(node.price));
          if (n) prices.push({ n, method: "json-ld-price" });
        }
      }
    } catch {
      /* */
    }
  }
  if (!prices.length) return null;
  // prefer single product offer; take first reasonable
  return { ok: true, price: prices[0].n, method: prices[0].method, all: prices };
}

function fromMeta(html) {
  const patterns = [
    [/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i, "itemprop"],
    [/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i, "itemprop2"],
    [/property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i, "og"],
    [/content=["']([^"']+)["'][^>]*property=["']product:price:amount["']/i, "og2"],
    [/property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i, "og3"],
    [/data-price=["']([^"']+)["']/i, "data-price"],
    [/data-product-price=["']([^"']+)["']/i, "data-product-price"],
    [/"price"\s*:\s*"?(\d[\d\s.,]*)"?/i, "json-price"],
    [/"price_value"\s*:\s*"?(\d[\d\s.,]*)"?/i, "price_value"],
    [/"special"\s*:\s*"?(\d[\d\s.,]*)"?/i, "special"],
  ];
  for (const [re, method] of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const n = parseNumber(m[1]);
      if (n) return { ok: true, price: n, method };
    }
  }
  return null;
}

function fromRegexUah(html) {
  const re =
    /(\d{1,3}(?:[\s\u00a0.]\d{3})+|\d{4,7})(?:[.,]\d{2})?\s*(?:грн|₴|UAH)/gi;
  const candidates = [];
  let m;
  while ((m = re.exec(html))) {
    const n = parseNumber(m[1]);
    if (n && n >= 1000 && n <= 5_000_000) candidates.push(n);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  return {
    ok: true,
    price: candidates[Math.floor(candidates.length / 2)],
    method: "regex-uah",
    samples: [...new Set(candidates)].slice(0, 10),
  };
}

async function extract(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  return (
    fromJsonLd(html) ||
    fromMeta(html) ||
    fromRegexUah(html) || { ok: false, error: "Price not found", len: html.length }
  );
}

const urls = [
  // OpticStore
  "https://opticstore.com.ua/product/teplovizor-pulsar-axion-xm30f",
  "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-le10s",
  "https://opticstore.com.ua/product/teplovizor-pulsar-axion-2-xq35",
  // ProfOptica
  "https://profoptica.com.ua/teplovizor-dlya-smartfona-hikvision-hikmicro-hm-tb3317-3m1-mini-dlya-android/",
  "https://profoptica.com.ua/teplovizionnyy-monokulyar-guide-trackir-35-400h300/",
  "https://profoptica.com.ua/teplovizor-thermtec-cyclops-650-se/",
  // Optics-Pro
  "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xm30f",
  "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg35",
];

for (const url of urls) {
  try {
    const r = await extract(url);
    console.log(JSON.stringify({ url, ...r }));
  } catch (e) {
    console.log(JSON.stringify({ url, ok: false, error: e.message }));
  }
}
