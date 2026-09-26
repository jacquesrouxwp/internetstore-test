/**
 * What may be offered to Google Merchant Center.
 *
 * Google's Shopping policy refuses firearms and their parts, and it counts
 * anything that mounts on a weapon as a part: riflescopes, clip-on
 * attachments, mounts and rails. The account was warned on 2026-09-26
 * ("Огнестрельное оружие и его детали", 640 items, products blocked from
 * 2026-10-02), so the feed now carries observation devices only — handheld
 * thermal monoculars, binoculars, night-vision devices and neutral
 * accessories.
 *
 * The shop keeps selling everything: this filter decides what Google is
 * offered, not what the site shows.
 */

import type { Product } from "@/types";
import { MERCHANT_DISAPPROVED_IDS } from "@/data/merchant-disapproved-ids";

/** Categories that exist to be mounted on a weapon. */
export const WEAPON_CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  "pricili",
  "pricili-pnb",
  "nasadky",
  "kolimatronie",
]);

/** deviceType values for weapon-mounted optics. */
const WEAPON_DEVICE_TYPES: ReadonlySet<string> = new Set(["scope", "clipon"]);

/**
 * Names that mark a weapon part even when the category is wrong — the
 * catalogue files some attachments and mounts under "тепловізори".
 */
const WEAPON_NAME = new RegExp(
  [
    "приц[іи]л",
    "прицел",
    "pr[yi]ts[iy]l",
    "насадк",
    "nasadk",
    "кронштейн",
    "планк", // планка-перехідник під приціл
    "маунт",
    "кріплен",
    "креплен",
    "швидкознім",
    "швидкоз'?ємн",
    "быстросъ",
    "weaver",
    "picatinny",
    "пікатін",
    "пикатин",
    "weapon",
    "коліматор",
    "коллиматор",
    "kolimat",
  ].join("|"),
  "i",
);

export type MerchantBlockReason =
  | "weapon-category"
  | "weapon-device"
  | "weapon-name"
  | "disapproved";

/**
 * Why Google must not be offered this product, or null when it may be.
 * `feedId` is the id the feed publishes (SKU, or slug when there is none) —
 * it is what the Merchant Center export lists.
 */
export function merchantBlockReason(
  product: Product,
  feedId: string,
): MerchantBlockReason | null {
  if (feedId && MERCHANT_DISAPPROVED_IDS.has(feedId)) return "disapproved";

  const category = (product.categorySlug || "").toLowerCase();
  if (WEAPON_CATEGORY_SLUGS.has(category)) return "weapon-category";

  const device = (product.deviceType || "").toLowerCase();
  if (WEAPON_DEVICE_TYPES.has(device)) return "weapon-device";

  const names = [product.nameUk, product.nameRu, product.slug]
    .filter(Boolean)
    .join(" ");
  if (WEAPON_NAME.test(names)) return "weapon-name";

  return null;
}

export function isMerchantEligible(product: Product, feedId: string): boolean {
  return merchantBlockReason(product, feedId) === null;
}
