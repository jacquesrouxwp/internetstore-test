const catalogs = [
  "https://opticstore.com.ua/catalog/teplovizory",
  "https://profoptica.com.ua/teplovizory/",
  "https://www.optics-pro.com.ua/ua/teplovizori/",
];

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8",
};

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(25000),
    redirect: "follow",
  });
  const html = await res.text();
  return { status: res.status, html, finalUrl: res.url };
}

function sampleProductLinks(html, baseUrl) {
  const re = /href=["']([^"']+)["']/gi;
  const found = new Set();
  let m;
  while ((m = re.exec(html)) && found.size < 40) {
    let h = m[1];
    if (!h || h.startsWith("#") || h.startsWith("javascript:")) continue;
    if (h.startsWith("/")) {
      try {
        h = new URL(h, baseUrl).href;
      } catch {
        continue;
      }
    }
    if (!/^https?:/i.test(h)) continue;
    const low = h.toLowerCase();
    if (
      low.includes("facebook") ||
      low.includes("instagram") ||
      low.includes("telegram") ||
      low.includes("mailto:")
    )
      continue;
    // product-ish paths
    if (
      /\/(product|tovar|p\/|goods|catalog\/[^/]+\/[^/]+)/i.test(low) ||
      /teploviz|thermal|axion|pulsar|hikmicro|infiray|aghm|night/i.test(low)
    ) {
      found.add(h.split("#")[0].split("?")[0]);
    }
  }
  return [...found].slice(0, 12);
}

// Inline minimal extract (mirror production strategies)
function parseNumber(raw) {
  let s = String(raw).trim().replace(/\s/g, "").replace(/&nbsp;/gi, "");
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

function extract(html) {
  // JSON-LD
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
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
          if (off?.price != null) {
            const n =
              typeof off.price === "number"
                ? off.price
                : parseNumber(String(off.price));
            if (n) return { ok: true, price: n, method: "json-ld" };
          }
        }
      }
    } catch {
      /* */
    }
  }
  const metaPatterns = [
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*itemprop=["']price["']/i,
    /property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i,
    /"price"\s*:\s*"?(\d[\d\s.,]*)"?/i,
    /data-price=["']([^"']+)["']/i,
    /data-product-price=["']([^"']+)["']/i,
  ];
  for (const p of metaPatterns) {
    const mm = html.match(p);
    if (mm?.[1]) {
      const n = parseNumber(mm[1]);
      if (n) return { ok: true, price: n, method: "meta" };
    }
  }
  const uah =
    /(\d{1,3}(?:[\s\u00a0.]\d{3})+|\d{4,7})(?:[.,]\d{2})?\s*(?:грн|₴|UAH)/gi;
  const candidates = [];
  while ((m = uah.exec(html))) {
    const n = parseNumber(m[1]);
    if (n && n >= 500) candidates.push(n);
  }
  if (candidates.length) {
    candidates.sort((a, b) => a - b);
    return {
      ok: true,
      price: candidates[Math.floor(candidates.length / 2)],
      method: "regex-uah",
      samples: candidates.slice(0, 8),
    };
  }
  return { ok: false, error: "not found" };
}

for (const url of catalogs) {
  console.log("\n======== CATALOG", url);
  try {
    const { status, html } = await fetchHtml(url);
    console.log("status", status, "len", html.length);
    const links = sampleProductLinks(html, url);
    console.log("product-ish links:", links.length);
    links.slice(0, 6).forEach((l) => console.log("  ", l));

    // try first few product pages
    for (const pl of links.slice(0, 3)) {
      try {
        const page = await fetchHtml(pl);
        const r = extract(page.html);
        console.log("  PRODUCT", pl);
        console.log("   ->", JSON.stringify(r));
        console.log(
          "   markers: ld=",
          /application\/ld\+json/i.test(page.html),
          "itemprop=",
          /itemprop=["']price/i.test(page.html),
          "data-price=",
          /data-price=/i.test(page.html)
        );
      } catch (e) {
        console.log("  PRODUCT fail", pl, e.message);
      }
    }
  } catch (e) {
    console.log("FAIL", e.message);
  }
}
