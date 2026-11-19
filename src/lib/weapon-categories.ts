/**
 * Catalogue categories that exist to be mounted on a weapon. Google Shopping
 * counts these as firearm parts; they never go to Merchant Center, and on the
 * pages of products that do, the site's menus leave them out (see
 * MerchantCleanPage). Kept apart from lib/merchant-eligibility so the client
 * header can use it without the disapproved-id list.
 */
export const WEAPON_CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  "pricili",
  "pricili-pnb",
  "nasadky",
  "kolimatronie",
]);

/** Marks an element that is hidden on pages Google Shopping reviews. */
export const weaponNav = (slug: string) => (WEAPON_CATEGORY_SLUGS.has(slug) ? { "data-weapon-nav": "" } : {});
