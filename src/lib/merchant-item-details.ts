/**
 * Structured extras for the Merchant Center feed: `product_highlight` and
 * `product_detail`.
 *
 * Merchant Center asked for "missing information" on 122 monoculars
 * (recommendation of 2026-09-26). The prose description already runs ~870
 * characters, so what Google is missing is not text but structure: short
 * highlight bullets it can show under the offer, and attribute triples it can
 * filter and match queries on. Both are built from the same spec sheet the
 * product page shows — nothing here is written by hand per product, and a
 * value the sheet does not state is skipped rather than guessed.
 */

import { productMetrics } from "@/lib/comparisons";
import {
  buildSpecRows,
  classifySpecKey,
  type SpecSectionId,
} from "@/lib/product-specs";
import type { Locale, Product } from "@/types";

export interface ProductDetailEntry {
  section: string;
  name: string;
  value: string;
}

/** Google shows up to 10; six reads better under an offer. */
const MAX_HIGHLIGHTS = 6;
/** Google accepts up to 1000 details; the sheet rarely has more than 25. */
const MAX_DETAILS = 25;

const SECTION_NAMES: Record<SpecSectionId, Record<Locale, string>> = {
  main: { uk: "Основні характеристики", ru: "Основные характеристики" },
  matrix: { uk: "Матриця", ru: "Матрица" },
  optics: { uk: "Оптика", ru: "Оптика" },
  display: { uk: "Дисплей", ru: "Дисплей" },
  rangefinder: { uk: "Далекомір", ru: "Дальномер" },
  ops: { uk: "Експлуатаційні характеристики", ru: "Эксплуатационные характеристики" },
  power: { uk: "Живлення та автономність", ru: "Питание и автономность" },
  features: { uk: "Функції", ru: "Функции" },
  package: { uk: "Комплектація", ru: "Комплектация" },
};

/** "6.5" → "6,5" — a decimal comma, as everywhere else on the site. */
function decimal(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}

/**
 * Short selling points, each one a number from the spec sheet.
 * Order matters: Google may truncate the list on narrow layouts.
 */
export function productHighlights(product: Product, locale: Locale): string[] {
  const m = productMetrics(product);
  const ru = locale === "ru";
  const out: string[] = [];

  if (m.resolution) {
    out.push(
      `${ru ? "Матрица" : "Матриця"} ${m.resolution.replace(/x/i, "\u00d7")}${
        m.pitchUm ? `, ${ru ? "пиксель" : "піксель"} ${decimal(m.pitchUm)} мкм` : ""
      }`,
    );
  }
  if (m.lensMm) {
    out.push(`${ru ? "Объектив" : "Об'єктив"} ${decimal(m.lensMm)} мм`);
  }
  if (m.detectM) {
    out.push(
      ru
        ? `Дальность обнаружения человека ${m.detectM} м`
        : `Дальність виявлення людини ${m.detectM} м`,
    );
  }
  if (m.netdMk) {
    out.push(
      ru
        ? `Чувствительность NETD ${m.netdMk} мК`
        : `Чутливість NETD ${m.netdMk} мК`,
    );
  }
  if (m.weightG) {
    out.push(`${ru ? "Вес" : "Вага"} ${Math.round(m.weightG)} г`);
  }
  if (m.batteryH) {
    out.push(
      ru
        ? `До ${decimal(m.batteryH)} ч от одного заряда`
        : `До ${decimal(m.batteryH)} год від одного заряду`,
    );
  }
  if (m.lrf === true) {
    out.push(ru ? "Встроенный лазерный дальномер" : "Вбудований лазерний далекомір");
  }

  return out.slice(0, MAX_HIGHLIGHTS);
}

/**
 * The spec sheet as section/name/value triples — the same rows the product
 * page prints, so the feed and the page can never disagree.
 */
export function productDetails(
  product: Product,
  locale: Locale,
): ProductDetailEntry[] {
  const rows = buildSpecRows(product.specs, {
    locale,
    resolution: product.resolution,
    detectionRangeM: product.detectionRangeM,
  });

  const out: ProductDetailEntry[] = [];
  for (const row of rows) {
    if (out.length >= MAX_DETAILS) break;
    const label = row.label?.trim();
    const value = row.value?.trim();
    if (!label || !value) continue;
    const section = classifySpecKey(row.sourceKey || row.key);
    out.push({
      section: SECTION_NAMES[section][locale],
      // Google caps these at 140 / 1000 characters
      name: label.slice(0, 140),
      value: value.slice(0, 1000),
    });
  }
  return out;
}
