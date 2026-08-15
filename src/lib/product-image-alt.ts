/**
 * Meaningful alt text for product photos (gallery, cards, OG, cart).
 * Empty custom alts fall back to the product name.
 */

/** Prefer non-empty custom alt; otherwise product name (never empty string). */
export function resolveProductImageAlt(
  productName: string,
  imageAlts?: string[] | null,
  index = 0
): string {
  const custom = String(imageAlts?.[index] ?? "").trim();
  if (custom) return custom;
  const name = String(productName ?? "").trim();
  if (name) return name;
  return "Товар";
}

/**
 * Absolute URL for a product image (Supabase, CDN, or site-relative path).
 */
export function absoluteProductImageUrl(
  src: string,
  siteUrl: string
): string {
  const s = String(src || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  const base = siteUrl.replace(/\/$/, "");
  return s.startsWith("/") ? `${base}${s}` : `${base}/${s}`;
}

/** All product image URLs as absolute https links (skips empties). */
export function absoluteProductImageUrls(
  images: string[] | null | undefined,
  siteUrl: string
): string[] {
  if (!images?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of images) {
    const abs = absoluteProductImageUrl(raw, siteUrl);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}
