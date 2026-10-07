/**
 * Meta description for product pages.
 *
 * The old description was `shortUk || name`, and the imported short text begins
 * with the product name, so Google got "AGM RATTLER V2 35-384 AGM RATTLER V2
 * 35-384 - універсальний…" — the name twice, then a sentence copied verbatim
 * from the donor shop. This builds one from our own data instead: name, the
 * shop brand in both scripts (people search "про оптикс" in Cyrillic, the site
 * only ever said "Pro-Optics"), key specs, price and service terms.
 *
 * Parts are appended whole and only while they fit, so the snippet never ends
 * mid-sentence.
 */

import type { Locale, Product } from "@/types";

/** Google renders roughly this many characters before truncating. */
export const META_DESCRIPTION_MAX = 160;

const COPY = {
  uk: {
    buy: "купити в Pro-Optics (Про Оптікс).",
    matrix: "Матриця",
    range: "дальність виявлення",
    price: "Ціна",
    inStock: "В наявності.",
    service: "Доставка Новою Поштою по Україні, гарантія.",
  },
  ru: {
    buy: "купить в Pro-Optics (Про Оптикс).",
    matrix: "Матрица",
    range: "дальность обнаружения",
    price: "Цена",
    inStock: "В наличии.",
    service: "Доставка Новой Почтой по Украине, гарантия.",
  },
  // The English pages went live without this entry, and every /en product
  // page answered 500 (October 2026) — Googlebot was crawling them.
  en: {
    buy: "buy at Pro-Optics.",
    matrix: "Sensor",
    range: "detection range",
    price: "Price",
    inStock: "In stock.",
    service: "Nova Poshta delivery across Ukraine, warranty.",
  },
} as const satisfies Record<Locale, Record<string, string>>;

const UNITS: Record<Locale, { uah: string; m: string }> = {
  uk: { uah: "грн.", m: "м" },
  ru: { uah: "грн.", m: "м" },
  en: { uah: "UAH.", m: "m" },
};

/** 45000 → "45 000" with a plain space (stable across Node/ICU versions). */
function formatUah(price: number): string {
  return String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function normalizeResolution(res: string): string {
  return res.trim().replace(/\s*[xх×]\s*/i, "×");
}

export function productMetaDescription(
  product: Pick<Product, "price" | "stock" | "resolution" | "detectionRangeM">,
  name: string,
  locale: Locale
): string {
  const c = COPY[locale];
  const parts: string[] = [`${name} — ${c.buy}`];

  const specs: string[] = [];
  if (product.resolution) {
    specs.push(`${c.matrix} ${normalizeResolution(product.resolution)}`);
  }
  if (product.detectionRangeM && product.detectionRangeM > 0) {
    specs.push(`${c.range} ${Math.round(product.detectionRangeM)} ${UNITS[locale].m}`);
  }
  if (specs.length) parts.push(`${specs.join(", ")}.`);

  if (product.price > 0) parts.push(`${c.price} ${formatUah(product.price)} ${UNITS[locale].uah}`);
  if (product.stock > 0) parts.push(c.inStock);
  parts.push(c.service);

  // The lead always ships; the rest only while it fits.
  let out = parts[0];
  for (const part of parts.slice(1)) {
    const next = `${out} ${part}`;
    if (next.length > META_DESCRIPTION_MAX) continue;
    out = next;
  }
  return out;
}
