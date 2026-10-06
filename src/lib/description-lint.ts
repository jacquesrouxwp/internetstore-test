/**
 * Gate for product descriptions before they are written to the database.
 *
 * Every rule comes from something that reached production:
 *
 *  - weapon vocabulary — the 2 October rewrite put "Для стрільби цього
 *    формфактора недостатньо" and "сяде в рюкзак чи на зброю" on 378 of the
 *    494 feed products, and Google disapproved 15 monoculars under its
 *    firearms policy;
 *  - generator glue — 367 descriptions were assembled from the same links,
 *    "Головний орієнтир у цифрах" alone on 365 products;
 *  - yes/no values presented as figures — "Окремо зазначено оптичне
 *    збільшення — Ні" on 103 products;
 *  - figures missing from the spec sheet — the shop's standing rule is never
 *    to invent a specification.
 *
 * Pure functions, no I/O. scripts/check-descriptions.ts runs them on an export
 * of GET /api/admin/products, before anything is written back.
 */

import type { Product } from "@/types";
import {
  ACCESSORY_SLUG,
  isMerchantEligible,
  merchantItemId,
} from "@/lib/merchant-eligibility";
import { mentionsWeapon, mentionsWeaponUse } from "@/lib/merchant-description";

export type LintLocale = "uk" | "ru";

/** The fields the gate reads — what the admin API returns, loosely typed. */
export interface LintProduct {
  slug: string;
  nameUk: string;
  nameRu?: string | null;
  sku?: string | null;
  categorySlug?: string | null;
  deviceType?: string | null;
  descriptionUk?: string | null;
  descriptionRu?: string | null;
  specs?: Record<string, unknown> | null;
  [field: string]: unknown;
}

export type LintCode =
  | "missing"
  | "length"
  | "weapon"
  | "glue"
  | "yes-no"
  | "superlative"
  | "figure"
  | "model"
  | "language";

export interface LintIssue {
  code: LintCode;
  locale: LintLocale;
  detail: string;
}

export interface RepeatedLead {
  locale: LintLocale;
  lead: string;
  count: number;
  slugs: string[];
}

export interface LintReport {
  products: { slug: string; issues: LintIssue[] }[];
  repeated: RepeatedLead[];
}

export const LENGTH = { min: 1200, max: 1800 };

/** A sentence opening may be shared by at most this many products. */
export const MAX_SHARED_LEAD = 5;

/**
 * Words of the sentence skeleton compared across products. Measured on the
 * 127 Grok texts of 5 October: at four words ordinary openings collide
 * ("Об'єктив N мм і …", 18 repeats); at six only habits remain — "Об'єктив
 * N мм зі світлосилою M" opened a sentence on 19 of the 127 products.
 */
const LEAD_WORDS = 6;

/**
 * Links the generator used on hundreds of products. A batch can be varied in
 * itself and still reuse one of these, because the rest of the catalogue is
 * not in the batch — so they are refused outright.
 */
const GLUE: RegExp[] = [
  /Головний орієнтир у цифрах/i,
  /Главный ориентир в цифрах/i,
  /У паспорті також є/i,
  /В паспорте также есть/i,
  /Окремо зазначено/i,
  /Отдельно указан/i,
  /Ще одна цифра з картки/i,
  /Ещё одна цифра из карточки|Еще одна цифра из карточки/i,
  /Для стр[іи]льби цього формфактора/i,
  /Для стрельбы этого формфактора/i,
  /Бренд \S+ у цій картці/i,
  /Бренд \S+ в этой карточке/i,
  /Усі висновки нижче/i,
  /Все выводы ниже/i,
  /Звіряйте комплектацію/i,
  /Для комплектації важливо, що/i,
  /Для комплектации важно, что/i,
  /допомагають зрозуміти, як прилад сяде/i,
  /розпізнавання силуету на практиці/i,
  /Перед замовленням порівняйте тип/i,
  /У лінійці/i,
  /Конструкція орієнтована/i,
  /усі цифри нижче взяті/i,
];

const SUPERLATIVE =
  /найкращ|№\s?1\b|номер один|неперевершен|ідеальн|найпотужніш|найдальш|лучш(?:ий|ая|ее|ие)\b|непревзойд|идеальн|самы[йм]\s+мощн|відгук|рейтинг|отзыв/i;

/** A sentence that ends on a yes/no value, as if it were a figure. */
const YES_NO = /[:—–=]\s*«?(?:Так|Ні|Немає|Є|Да|Нет|Есть)»?\s*[.;!]?$/i;

const NOT_UK = /[ыэъё]/i;
const NOT_RU = /[іїєґ]/i;

export function sentences(text: string): string[] {
  return (text || "")
    .split(/(?<=[.!?•;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A sentence with its particulars blanked: figures become N, Latin runs
 * (brands, models) become M, quoted spec names become «…». Two products whose
 * sentences share a skeleton were written from one template.
 */
export function skeleton(sentence: string): string {
  return sentence
    .replace(/«[^»]*»/g, "«…»")
    .replace(/[A-Za-z][A-Za-z0-9.\-/+()]*(?:\s+[A-Za-z0-9][A-Za-z0-9.\-/+()]*)*/g, "M")
    .replace(/\d[\d\s.,×xх/–-]*\d|\d/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

export function sentenceLead(sentence: string, size = LEAD_WORDS): string | null {
  const words = skeleton(sentence).split(" ");
  return words.length >= size ? words.slice(0, size).join(" ") : null;
}

/** Figures as the spec sheet writes them: "50 000" → 50000, "1,5" → 1.5. */
function figures(text: string): string[] {
  const joined = (text || "")
    .replace(/(\d)[\s ](?=\d{3}\b)/g, "$1")
    .replace(/(\d),(\d)/g, "$1.$2");
  return joined.match(/\d+(?:\.\d+)?/g) || [];
}

/**
 * What a description may quote: the product's name and its spec sheet, and
 * nothing else. The admin export carries ids, image URLs, timestamps and stock
 * counts too, and every one of them holds digit runs — measured on the 1224
 * products of 6 October, a record "knew" 54 figures on average against 25 real
 * ones, and on ATN OTS-HD 640 5-50X the invented "ідентифікацію на 600 м"
 * passed as known. The price is left out on purpose: it changes, and a
 * description that quotes it goes stale.
 */
const FIGURE_SOURCES = ["nameUk", "nameRu", "resolution", "detectionRangeM", "specs"] as const;

function knownFigures(product: LintProduct): Set<string> {
  const sources = Object.fromEntries(FIGURE_SOURCES.map((k) => [k, product[k]]));
  return new Set(figures(JSON.stringify(sources)).map((f) => String(Number(f))));
}

/**
 * Small numbers say little ("2 акумулятори", "1/4") and years are not specs,
 * so neither is held against the sheet.
 */
function isCheckedFigure(f: string): boolean {
  const n = Number(f);
  if (n <= 3) return false;
  if (Number.isInteger(n) && n >= 1990 && n <= 2099) return false;
  return true;
}

/** Tokens of the name that carry a digit — "XQ35", "TM50-640", "640". */
function modelTokens(nameUk: string): string[] {
  return (nameUk || "")
    .split(/[\s()]+/)
    .map((t) => t.trim())
    .filter((t) => /\d/.test(t) && t.length > 1);
}

/** Feed products are held to the weapon rule; sights and clip-ons are not. */
function weaponCheck(product: LintProduct): ((text: string) => boolean) | null {
  const asProduct = product as unknown as Product;
  if (!isMerchantEligible(asProduct, merchantItemId(asProduct))) return null;
  const accessory = (product.categorySlug || "").toLowerCase() === ACCESSORY_SLUG;
  return accessory ? mentionsWeaponUse : mentionsWeapon;
}

export function lintProduct(product: LintProduct): LintIssue[] {
  const issues: LintIssue[] = [];
  const known = knownFigures(product);
  const models = modelTokens(product.nameUk);
  const weapon = weaponCheck(product);

  for (const locale of ["uk", "ru"] as const) {
    const text = ((locale === "uk" ? product.descriptionUk : product.descriptionRu) || "").trim();
    const add = (code: LintCode, detail: string) => issues.push({ code, locale, detail });

    if (!text) {
      add("missing", "описания нет");
      continue;
    }

    if (text.length < LENGTH.min || text.length > LENGTH.max) {
      add("length", `${text.length} знаков, нужно ${LENGTH.min}–${LENGTH.max}`);
    }

    if ((locale === "uk" ? NOT_UK : NOT_RU).test(text)) {
      const ch = text.match(locale === "uk" ? NOT_UK : NOT_RU)![0];
      add("language", `буква «${ch}» из другого языка`);
    }

    if (models.length) {
      const head = text.slice(0, 300).toLowerCase();
      if (!models.some((m) => head.includes(m.toLowerCase()))) {
        add("model", `модель (${models.join(", ")}) не названа в первых 300 знаках`);
      }
    }

    const missing = new Set<string>();
    for (const f of figures(text)) {
      if (isCheckedFigure(f) && !known.has(String(Number(f)))) missing.add(f);
    }
    if (missing.size) add("figure", `нет в характеристиках: ${Array.from(missing).join(", ")}`);

    for (const s of sentences(text)) {
      if (weapon && weapon(s)) add("weapon", s);
      if (GLUE.some((re) => re.test(s))) add("glue", s);
      if (YES_NO.test(s)) add("yes-no", s);
      if (SUPERLATIVE.test(s)) add("superlative", s);
    }
  }
  return issues;
}

/**
 * Sentence openings shared by more products than MAX_SHARED_LEAD allows.
 * Run it on the whole catalogue with the batch applied, not on the batch
 * alone: a template used four times in each of ten batches never shows up
 * inside one of them.
 */
export function repeatedLeads(products: LintProduct[], size = LEAD_WORDS): RepeatedLead[] {
  const out: RepeatedLead[] = [];
  for (const locale of ["uk", "ru"] as const) {
    const bySlug = new Map<string, Set<string>>();
    for (const p of products) {
      const text = (locale === "uk" ? p.descriptionUk : p.descriptionRu) || "";
      const seen = new Set<string>();
      for (const s of sentences(text)) {
        const lead = sentenceLead(s, size);
        if (!lead || seen.has(lead)) continue;
        seen.add(lead);
        if (!bySlug.has(lead)) bySlug.set(lead, new Set());
        bySlug.get(lead)!.add(p.slug);
      }
    }
    bySlug.forEach((slugs, lead) => {
      if (slugs.size > MAX_SHARED_LEAD) {
        out.push({ locale, lead, count: slugs.size, slugs: Array.from(slugs) });
      }
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function lintDescriptions(products: LintProduct[]): LintReport {
  return {
    products: products
      .map((p) => ({ slug: p.slug, issues: lintProduct(p) }))
      .filter((r) => r.issues.length),
    repeated: repeatedLeads(products),
  };
}
