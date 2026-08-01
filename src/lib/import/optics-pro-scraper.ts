/**
 * Network + parsing primitives for scraping optics-pro.com.ua product pages.
 * Server-only. No DB/Supabase dependency here on purpose -- keeps this
 * testable/runnable as a pure dry-run against the live donor site.
 */

const BASE = "https://www.optics-pro.com.ua/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function fetchDonorHtml(
  url: string,
  timeoutMs = 20000
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Product URLs from a category listing page (schema.org microdata `<link itemprop="url">`). */
export function extractListingProductUrls(html: string): string[] {
  const out: string[] = [];
  const re = /<link itemprop="url" href="([^"]+)"\s*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1].replace(/^\/+/, ""));
  return out;
}

export type DiscoverOptions = {
  maxPages?: number;
  perPage?: number;
  delayMs?: number;
  onPage?: (page: number, foundOnPage: number, totalSoFar: number) => void;
};

/**
 * Crawl every listing page of one donor root category (`?limit=…&page=…`)
 * and return the deduped set of product URLs. Stops when a page adds no new
 * URLs (covers both "last page" and pagination oddities).
 */
export async function discoverProductUrls(
  rootPath: string,
  opts: DiscoverOptions = {}
): Promise<string[]> {
  const maxPages = opts.maxPages ?? 80;
  const perPage = opts.perPage ?? 100;
  const delayMs = opts.delayMs ?? 300;
  const urls = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE}ua/${rootPath}/?limit=${perPage}${page > 1 ? `&page=${page}` : ""}`;
    const html = await fetchDonorHtml(url);
    const found = extractListingProductUrls(html);
    const before = urls.size;
    for (const f of found) urls.add(f);
    opts.onPage?.(page, found.length, urls.size);
    if (!found.length || urls.size === before) break;
    if (delayMs) await sleep(delayMs);
  }
  return Array.from(urls);
}

export type ParsedDonorProduct = {
  url: string;
  name: string;
  brandName: string | null;
  model: string | null;
  sku: string | null;
  price: number | null;
  availability: string | null;
  descriptionRaw: string;
  specPairs: Array<{ name: string; value: string }>;
  images: string[];
};

function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (parsed && typeof parsed === "object") {
        out.push(parsed as Record<string, unknown>);
      }
    } catch {
      /* malformed/foreign JSON-LD block -- skip */
    }
  }
  return out;
}

function jsonLdType(block: Record<string, unknown>): string {
  return String(block["@type"] || "");
}

/** Parse a fetched product-page HTML string into structured donor data. */
export function parseProductPage(
  html: string,
  url: string
): ParsedDonorProduct | null {
  const blocks = extractJsonLdBlocks(html);
  const product = blocks.find((b) => jsonLdType(b) === "Product");
  if (!product) return null;

  const brand = product.brand as { name?: unknown } | undefined;
  const offers = product.offers as
    | { price?: unknown; availability?: unknown }
    | undefined;
  const additionalProperty = Array.isArray(product.additionalProperty)
    ? (product.additionalProperty as Array<{
        name?: unknown;
        value?: unknown;
      }>)
    : [];

  const gallery = blocks.find((b) => jsonLdType(b) === "ImageGallery");
  const images = new Set<string>();
  if (typeof product.image === "string" && product.image) {
    images.add(product.image);
  }
  const associatedMedia = gallery?.associatedMedia;
  if (Array.isArray(associatedMedia)) {
    for (const item of associatedMedia) {
      const c = (item as Record<string, unknown>)?.contentUrl;
      if (typeof c === "string" && c) images.add(c);
    }
  }

  const priceNum =
    offers?.price != null ? Number(String(offers.price)) : NaN;

  return {
    url,
    name: String(product.name || "").trim(),
    brandName: brand?.name ? String(brand.name).trim() : null,
    model: product.model ? String(product.model).trim() : null,
    sku: product.sku
      ? String(product.sku).trim()
      : product.mpn
        ? String(product.mpn).trim()
        : null,
    price: Number.isFinite(priceNum) ? priceNum : null,
    availability: offers?.availability
      ? String(offers.availability).replace("https://schema.org/", "")
      : null,
    descriptionRaw: String(product.description || "").trim(),
    specPairs: additionalProperty
      .map((p) => ({
        name: String(p?.name ?? "").trim(),
        value: String(p?.value ?? "").trim(),
      }))
      .filter((p) => p.name),
    images: Array.from(images),
  };
}

/**
 * Double-control sanity check: every genuine gallery image for a product
 * lives under the same `image/cache/catalog/.../brand/model/` folder as the
 * main image. If a URL breaks that pattern it likely leaked in from a
 * "related products" block and must not be trusted as this product's photo.
 * (Weak signal on its own -- see filterImagesByModel below, which caught
 * cases this misses: donor pages that mix in a *different model's* photos
 * from the very same brand folder, e.g. AGM Taipan TM15384's gallery
 * containing "agm-taipan-tm10256-*.jpg".)
 */
export function imagesShareSameFolder(images: string[]): boolean {
  if (images.length <= 1) return true;
  const folderOf = (u: string) => u.slice(0, u.lastIndexOf("/"));
  const first = folderOf(images[0]);
  return images.every((u) => folderOf(u) === first);
}

function digitGroups(s: string): Set<string> {
  return new Set(s.match(/\d{2,}/g) || []);
}

/**
 * Soft, non-exclusionary sibling-model warning. The donor's own JSON-LD
 * `model`/`sku` field is sometimes an opaque internal part number that never
 * appears in any image filename (e.g. AGM Seeker's sku is "AA-0013456", but
 * its photos are named "agm-seeker-15-384-*.jpg") -- matching against that
 * field produced ~70% false positives in practice and is NOT used here.
 * Instead this compares the numeric identifiers embedded in the product's
 * own URL slug (which the donor derives from the same display name as the
 * image filenames, so it survives most formatting drift) against each
 * image's filename. Returns false only when the slug has a distinguishing
 * number that appears in NONE of the images -- a strong sign a photo was
 * borrowed from a different sibling SKU. Only a heads-up for manual review;
 * callers must not use this to drop photos (see imagesShareSameFolder for
 * the actual exclusion gate).
 */
export function looksLikeMatchingGallery(
  images: string[],
  productUrlPath: string
): boolean {
  const slugDigits = digitGroups(productUrlPath);
  if (!slugDigits.size || !images.length) return true;
  const slugDigitList = Array.from(slugDigits);
  return images.some((u) => {
    const filename = u.slice(u.lastIndexOf("/") + 1);
    const imgDigits = digitGroups(filename);
    return slugDigitList.some((d) => imgDigits.has(d));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run `worker` over `items` with bounded concurrency. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    run
  );
  await Promise.all(workers);
  return results;
}
