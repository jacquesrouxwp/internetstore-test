/**
 * Star ratings for a product card, computed from the spec sheet.
 *
 * These are NOT customer reviews. The shop has no review system, and inventing
 * ratings is what Merchant Center calls misrepresentation. Every star here is
 * arithmetic over a number the manufacturer states — matrix, detection range,
 * weight, battery, price — against a fixed scale published next to the block.
 * A criterion with no data in the spec sheet is left out rather than guessed,
 * and nothing from this module may be emitted as `aggregateRating` markup.
 *
 * The scales are absolute, not relative to the catalogue, so a product keeps
 * its stars when the assortment changes. Cut points come from the spread of
 * the catalogue itself (measured 2026-09-26, n=85 for range and price).
 */

import { productMetrics } from "@/lib/comparisons";
import { formatUah } from "@/lib/brand-pages";
import type { Locale, Product } from "@/types";

export type RatingKey = "detail" | "range" | "weight" | "battery" | "price";

export interface SpecRating {
  key: RatingKey;
  /** Criterion name, localized. */
  label: string;
  /** 1…5 */
  stars: number;
  /** The number the stars stand for, e.g. "1800 м". */
  value: string;
  /** What more stars mean here, localized. */
  hint: string;
}

/** Four ascending cut points; a value at or above each one adds a star. */
type Bounds = readonly [number, number, number, number];

function starsMoreIsBetter(value: number, bounds: Bounds): number {
  let stars = 1;
  for (const bound of bounds) if (value >= bound) stars += 1;
  return stars;
}

function starsLessIsBetter(value: number, bounds: Bounds): number {
  let stars = 5;
  for (const bound of bounds) if (value > bound) stars -= 1;
  return Math.max(1, stars);
}

/** 256x192 → 2★, 336x256 → 3★, 384x288 → 4★, 640x512 → 5★ */
const DETAIL_PX: Bounds = [40_000, 80_000, 100_000, 250_000];
/** Human detection, metres: 1000 → 2★, 1500 → 3★, 1800 → 4★, 2500 → 5★ */
const RANGE_M: Bounds = [600, 1100, 1600, 2300];
/** Grams, lighter is better: 300 → 5★, 900+ → 1★ */
const WEIGHT_G: Bounds = [300, 450, 650, 900];
/** Hours on one charge: 3 → 2★, 10 → 5★ */
const BATTERY_H: Bounds = [3, 5, 7, 10];
/** UAH, cheaper is better: 25 000 → 5★, above 150 000 → 1★ */
const PRICE_UAH: Bounds = [25_000, 55_000, 95_000, 150_000];

function pixelsOf(resolution: string | null): number | null {
  if (!resolution) return null;
  const m = /(\d{2,5})\s*[x\u00d7\u0445\u0425]\s*(\d{2,5})/i.exec(resolution);
  if (!m) return null;
  const px = Number(m[1]) * Number(m[2]);
  return Number.isFinite(px) && px > 0 ? px : null;
}

/** "6.5" → "6,5" — a decimal comma, as everywhere else on the site. */
function decimal(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}

const LABELS: Record<RatingKey, Record<Locale, string>> = {
  detail: { uk: "Деталізація", ru: "Детализация" },
  range: { uk: "Дальність", ru: "Дальность" },
  weight: { uk: "Вага", ru: "Вес" },
  battery: { uk: "Автономність", ru: "Автономность" },
  price: { uk: "Ціна", ru: "Цена" },
};

const HINTS: Record<RatingKey, Record<Locale, string>> = {
  detail: {
    uk: "більше пікселів у матриці — дрібніші деталі",
    ru: "больше пикселей в матрице — мельче детали",
  },
  range: {
    uk: "паспортна дальність виявлення людини",
    ru: "паспортная дальность обнаружения человека",
  },
  weight: { uk: "менша вага — більше зірок", ru: "меньше вес — больше звёзд" },
  battery: {
    uk: "довше працює від одного заряду",
    ru: "дольше работает от одного заряда",
  },
  price: { uk: "доступніша ціна — більше зірок", ru: "доступнее цена — больше звёзд" },
};

/**
 * Ratings for the criteria this product actually states, in reading order.
 * Returns an empty list when the spec sheet says nothing measurable.
 */
export function specRatings(product: Product, locale: Locale): SpecRating[] {
  const m = productMetrics(product);
  const out: SpecRating[] = [];
  const push = (key: RatingKey, stars: number, value: string) =>
    out.push({
      key,
      label: LABELS[key][locale],
      stars,
      value,
      hint: HINTS[key][locale],
    });

  const px = pixelsOf(m.resolution);
  if (px && m.resolution) {
    push("detail", starsMoreIsBetter(px, DETAIL_PX), m.resolution.replace(/x/i, "\u00d7"));
  }
  if (m.detectM && m.detectM > 0) {
    push("range", starsMoreIsBetter(m.detectM, RANGE_M), `${m.detectM} м`);
  }
  if (m.weightG && m.weightG > 0) {
    push("weight", starsLessIsBetter(m.weightG, WEIGHT_G), `${Math.round(m.weightG)} г`);
  }
  if (m.batteryH && m.batteryH > 0) {
    push(
      "battery",
      starsMoreIsBetter(m.batteryH, BATTERY_H),
      `${decimal(m.batteryH)} ${locale === "ru" ? "ч" : "год"}`,
    );
  }
  if (m.price && m.price > 0) {
    push("price", starsLessIsBetter(m.price, PRICE_UAH), formatUah(m.price));
  }

  return out;
}
