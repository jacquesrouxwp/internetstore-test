/**
 * Fetch competitor product page and extract UAH price.
 * Strategies (in order):
 *  1. JSON-LD Product / Offer (price | Price | lowPrice)
 *  2. Meta / itemprop / Open Graph / data-price
 *  3. Regex near грн / ₴
 * Server-only.
 */

export type ExtractResult =
  | { ok: true; price: number; method: string }
  | { ok: false; error: string };

function parseNumber(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  s = s
    .replace(/\s/g, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\u00a0/g, "");
  // 25.200,50 European thousands
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

/** Offer objects sometimes use Price (capital P) — OpticStore */
function offerPrice(off: Record<string, unknown>): number | null {
  const keys = ["price", "Price", "lowPrice", "LowPrice", "highPrice"];
  for (const k of keys) {
    const v = off[k];
    if (v == null) continue;
    const n = typeof v === "number" ? Math.round(v) : parseNumber(String(v));
    if (n) return n;
  }
  return null;
}

function walkJsonLd(node: unknown, out: number[], depth = 0): void {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    for (const n of node) walkJsonLd(n, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  if (o["@graph"]) walkJsonLd(o["@graph"], out, depth + 1);

  const type = o["@type"];
  const types = (Array.isArray(type) ? type : [type])
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  const isProduct = types.some(
    (t) => t.includes("product") && !t.includes("productmodel")
  );
  const isOffer = types.some((t) => t === "offer" || t.endsWith("/offer"));

  if (isProduct || isOffer) {
    const offers = o.offers;
    if (offers) {
      const list = Array.isArray(offers) ? offers : [offers];
      for (const off of list) {
        if (off && typeof off === "object") {
          const n = offerPrice(off as Record<string, unknown>);
          if (n) out.push(n);
        }
      }
    }
    const n = offerPrice(o);
    if (n) out.push(n);
  }
}

function fromJsonLd(html: string): ExtractResult | null {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const prices: number[] = [];

  while ((m = re.exec(html))) {
    try {
      const raw = m[1].trim();
      // some sites wrap with HTML comments
      const cleaned = raw.replace(/^<!--/, "").replace(/-->$/, "").trim();
      const data = JSON.parse(cleaned);
      walkJsonLd(data, prices);
    } catch {
      /* next script block */
    }
  }

  if (!prices.length) return null;
  // First Product offer is usually the main SKU
  return { ok: true, price: prices[0], method: "json-ld" };
}

function fromMeta(html: string): ExtractResult | null {
  const patterns: [RegExp, string][] = [
    // <span itemprop="price">53 640</span>
    [/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i, "itemprop-content"],
    [/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i, "itemprop-content"],
    [/itemprop=["']price["'][^>]*>\s*([0-9][0-9\s\u00a0.,]*)/i, "itemprop-text"],
    [
      /property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i,
      "og-product",
    ],
    [
      /content=["']([^"']+)["'][^>]*property=["']product:price:amount["']/i,
      "og-product",
    ],
    [
      /property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i,
      "og-price",
    ],
    [/data-product-price=["']([^"']+)["']/i, "data-product-price"],
    [/data-price=["']([^"']+)["']/i, "data-price"],
    [/"price_value"\s*:\s*"?(\d[\d\s.,]*)"?/i, "price_value"],
    [/"special"\s*:\s*"?(\d[\d\s.,]*)"?/i, "special"],
    // OpenCart / Woo often embed product JSON
    [/"price"\s*:\s*"?(\d{3,}[\d\s.,]*)"?/i, "json-price"],
  ];

  for (const [re, method] of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const n = parseNumber(m[1]);
      // skip tiny noise (shipping, qty)
      if (n && n >= 100) return { ok: true, price: n, method };
    }
  }
  return null;
}

function fromRegexUah(html: string): ExtractResult | null {
  // Prefer numbers next to currency markers
  const re =
    /(\d{1,3}(?:[\s\u00a0.]\d{3})+|\d{4,7})(?:[.,]\d{2})?\s*(?:грн|₴|UAH)/gi;
  const candidates: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const n = parseNumber(m[1]);
    // thermal optics range — drop tiny cart/delivery noise
    if (n && n >= 1000 && n <= 5_000_000) candidates.push(n);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  const mid = candidates[Math.floor(candidates.length / 2)];
  return { ok: true, price: mid, method: "regex-uah" };
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function extractPriceFromUrl(
  url: string
): Promise<ExtractResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "Invalid URL" };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: AbortSignal.timeout(18000),
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    if (html.length < 200) {
      return { ok: false, error: "Empty page" };
    }

    // Block pages / captcha heuristics
    if (
      /captcha|cf-browser-verification|access denied|just a moment/i.test(
        html.slice(0, 4000)
      ) &&
      html.length < 8000
    ) {
      return { ok: false, error: "Blocked or captcha page" };
    }

    return (
      fromJsonLd(html) ||
      fromMeta(html) ||
      fromRegexUah(html) || { ok: false, error: "Price not found on page" }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    if (/timeout|aborted/i.test(msg)) {
      return { ok: false, error: "Timeout loading page" };
    }
    return { ok: false, error: msg };
  }
}
