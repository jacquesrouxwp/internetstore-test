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
