/**
 * Products pulled off the public storefront without deleting rows or images.
 * Admin, OLX matching and the database stay as they are.
 *
 * Restore: remove the slug (and, if listed, the brand and blog slugs) from
 * the sets below. The homepage ticker is a separate switch in
 * `components/home/PromoTicker.tsx` (`isPromoTickerEnabled`).
 *
 * Temporarily hidden — owner request, November 2026:
 * thermal monocular Leonardo DRS IWS («Леонардо»).
 */

/** Direct product URLs and every public product query. */
export const TEMPORARILY_HIDDEN_PRODUCT_SLUGS = new Set<string>([
  "leonardo-drs-iws-teploviziynyy-monokuliar",
]);

/**
 * Brand chips, hover menus and /brand pages. Leonardo DRS was added for
 * this one monocular, so the brand disappears with it.
 */
export const TEMPORARILY_HIDDEN_BRAND_SLUGS = new Set<string>([
  "leonardo-drs",
]);

/**
 * Posts that exist to sell the hidden monocular. The roundup article that
 * only mentions it among other models is left in place.
 */
export const TEMPORARILY_HIDDEN_BLOG_SLUGS = new Set<string>([
  "leonardo-drs-iws-unikalna-propozytsiia",
  "leonardo-drs-istoriia-kompanii",
]);

function brandKey(slugOrName: string): string {
  return slugOrName.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function isTemporarilyHiddenProduct(
  slug: string | null | undefined
): boolean {
  if (!slug) return false;
  return TEMPORARILY_HIDDEN_PRODUCT_SLUGS.has(slug);
}

/** Matches a brand slug (`leonardo-drs`) or display name (`Leonardo DRS`). */
export function isTemporarilyHiddenBrand(
  slugOrName: string | null | undefined
): boolean {
  if (!slugOrName) return false;
  return TEMPORARILY_HIDDEN_BRAND_SLUGS.has(brandKey(slugOrName));
}

export function isTemporarilyHiddenBlogPost(
  slug: string | null | undefined
): boolean {
  if (!slug) return false;
  return TEMPORARILY_HIDDEN_BLOG_SLUGS.has(slug);
}

/**
 * The header marquee has no other message in uk, ru or en — it only
 * advertised Leonardo DRS IWS. Restore: return true (and un-hide the slug).
 */
export function isPromoTickerEnabled(): boolean {
  return false;
}
