/**
 * Feed photos for items Merchant Center refused under "Рекламный оверлей на
 * изображении" (promotional overlay). The supplier's first photo carries a
 * badge — "1300 м", "МАТРИЦА 640 · 2200 м", "НОВАЯ МАТРИЦА · 2600 м" — and
 * Google does not accept text over the product. Keyed by the feed id
 * (merchantItemId); indexes point into the product's own image list.
 *
 * Only the feed changes: the site keeps its gallery as it is.
 * Checked by eye on 2026-10-20.
 */
export type MerchantImageOverride = {
  /** Photos with an overlay — never sent to Google. */
  drop: number[];
  /** Photo to send as image_link; defaults to the first one left. */
  main?: number;
};

export const MERCHANT_IMAGE_OVERRIDES: Readonly<Record<string, MerchantImageOverride>> = {
  "77479": { drop: [0] }, // Pulsar Axion 2 XQ35 LRF — "1300 м"
  "TA62-35": { drop: [0], main: 2 }, // PARD TA62-35 — "МАТРИЦА 640 · 2200 м"; 2 is on white
  "INFIRAY XEYE 2 E6 PRO V2": { drop: [0] }, // "НОВАЯ МАТРИЦА · 2600 м"
  "TPC-M40-B13-G": { drop: [0, 1] }, // Dahua — "400x300 · 508 м", 1 has callout labels
};

/** The product's photos in the order the feed should send them. */
export function feedImageOrder(feedId: string, images: string[]): string[] {
  const o = MERCHANT_IMAGE_OVERRIDES[feedId];
  if (!o) return images;
  const kept = images
    .map((url, i) => ({ url, i }))
    .filter(({ i }) => !o.drop.includes(i));
  const main = kept.find(({ i }) => i === o.main);
  const ordered = main ? [main, ...kept.filter((k) => k !== main)] : kept;
  return ordered.map(({ url }) => url);
}
