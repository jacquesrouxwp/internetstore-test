/**
 * Fetch competitor product page and extract UAH price.
 * Strategies: JSON-LD Product, meta itemprop, common regex.
 * Server-only.
 */

export type ExtractResult =
  | { ok: true; price: number; method: string }
  | { ok: false; error: string };

function parseNumber(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  // 25 200,00 or 25,200.00 or 25200
  s = s.replace(/\s/g, "").replace(/&nbsp;/gi, "");
  // Ukrainian: 25200,50 → 25200.50
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    // 25.200,50 European thousands
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

function fromJsonLd(html: string): ExtractResult | null {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : [data];
      const flat: unknown[] = [];
      for (const n of nodes) {
        flat.push(n);
        if (n && typeof n === "object" && "@graph" in (n as object)) {
          const g = (n as { "@graph": unknown[] })["@graph"];
          if (Array.isArray(g)) flat.push(...g);
        }
      }
      for (const node of flat) {
        if (!node || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        const type = o["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (!types.some((t) => String(t).toLowerCase().includes("product"))) {
          continue;
        }
        const offers = o.offers;
        const offerList = Array.isArray(offers)
          ? offers
          : offers
            ? [offers]
            : [];
        for (const off of offerList) {
          if (!off || typeof off !== "object") continue;
          const price = (off as { price?: string | number }).price;
          if (price != null) {
            const n =
              typeof price === "number" ? price : parseNumber(String(price));
            if (n) return { ok: true, price: n, method: "json-ld" };
          }
        }
        if (o.price != null) {
          const n =
            typeof o.price === "number"
              ? o.price
              : parseNumber(String(o.price));
          if (n) return { ok: true, price: n, method: "json-ld-price" };
        }
      }
    } catch {
      /* next script */
    }
  }
  return null;
}

function fromMeta(html: string): ExtractResult | null {
  const patterns = [
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*itemprop=["']price["']/i,
    /property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']product:price:amount["']/i,
    /"price"\s*:\s*"?(\d[\d\s.,]*)"?/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const n = parseNumber(m[1]);
      if (n) return { ok: true, price: n, method: "meta" };
    }
  }
  return null;
}

function fromRegexUah(html: string): ExtractResult | null {
  // Prefer explicit UAH / грн near numbers
  const re =
    /(\d{1,3}(?:[\s\u00a0.]\d{3})+|\d{4,7})(?:[.,]\d{2})?\s*(?:грн|₴|UAH)/gi;
  const candidates: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const n = parseNumber(m[1]);
    if (n && n >= 500) candidates.push(n); // skip tiny noise
  }
  if (!candidates.length) return null;
  // mode-ish: median of candidates (less noise than min)
  candidates.sort((a, b) => a - b);
  const mid = candidates[Math.floor(candidates.length / 2)];
  return { ok: true, price: mid, method: "regex-uah" };
}

export async function extractPriceFromUrl(
  url: string
): Promise<ExtractResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "Invalid URL" };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProOpticsPriceBot/1.0; +https://pro-optics.ua)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(15000),
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

    return (
      fromJsonLd(html) ||
      fromMeta(html) ||
      fromRegexUah(html) || { ok: false, error: "Price not found on page" }
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Fetch failed",
    };
  }
}
