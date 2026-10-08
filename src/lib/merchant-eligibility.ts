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
 * offered. What the pages of those products say is decided in
 * lib/merchant-description.
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

/** The one category whose products are not observation devices. */
export const ACCESSORY_SLUG = "aksesuary";

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

/**
 * An accessory whose own text describes rail mounting is a weapon accessory,
 * whatever it is called. The Armasight external power supply taught this:
 * named "Джерело зовнішнього живлення", described as a block that rides on
 * the Picatinny rail beside the sight, "на зброї", "на цівці".
 *
 * Devices are exempt — a night-vision monocular with a Weaver rail for an IR
 * illuminator is still an observation device.
 */
const RAIL_MOUNT = /picatinny|weaver|п[іи]катін|пикатин|ц[іи]вц|цевь/i;

export type MerchantBlockReason =
  | "weapon-category"
  | "weapon-device"
  | "weapon-name"
  | "weapon-rail"
  | "disapproved";

/** Google caps g:id at 50 — counted in UTF-8 bytes, not characters. */
const MAX_ID_BYTES = 50;

/**
 * The id the feed publishes: the SKU, or the slug when there is none. A SKU
 * over 50 bytes falls back to the slug (Latin, so bytes = characters): the
 * Cyrillic "Батарея HikMicro THUNDER 2.0 Battery HM-3644DC" is 46 characters
 * but 53 bytes, and Merchant Center rejected it as too long (October 2026).
 */
export function merchantItemId(product: Pick<Product, "sku" | "slug">): string {
  const sku = (product.sku && String(product.sku).trim()) || "";
  if (sku && new TextEncoder().encode(sku).length <= MAX_ID_BYTES) return sku;
  return product.slug.slice(0, MAX_ID_BYTES);
}

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

  if (category === ACCESSORY_SLUG) {
    const text = [product.descriptionUk, product.descriptionRu]
      .filter(Boolean)
      .join(" ");
    if (RAIL_MOUNT.test(text)) return "weapon-rail";
  }

  return null;
}

export function isMerchantEligible(product: Product, feedId: string): boolean {
  return merchantBlockReason(product, feedId) === null;
}
