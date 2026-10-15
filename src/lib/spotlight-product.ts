/**
 * Hand-picked SKUs that get a special storefront treatment
 * (glow, “don't miss” ribbon, pulsing price).
 */
export const SPOTLIGHT_SLUGS = new Set([
  "leonardo-drs-iws-teploviziynyy-monokuliar",
]);

export function isSpotlightProduct(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return SPOTLIGHT_SLUGS.has(slug);
}

/**
 * Hand-picked SKUs shown with a blue frame — a quieter mark than the
 * spotlight, no ribbon, for models the owner wants in front (HikMicro LYNX Pro LE15,
 * October 2026).
 */
export const POPULAR_SLUGS = new Set([
  "hikmicro-teplovizor-hikmicro-lynx-pro-le15-hm-ts02-15xg-w-le15",
]);

export function isPopularProduct(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return POPULAR_SLUGS.has(slug);
}
