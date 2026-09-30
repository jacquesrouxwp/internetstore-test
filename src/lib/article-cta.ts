/**
 * The "what now" block under a blog post.
 *
 * An article that explains a choice should end where the choice is made, so
 * the block points at the catalogue — but not at the same page every time.
 * The links are picked from what the article actually discusses: a piece about
 * 384 against 640 ends with both collections, one about a rangefinder ends
 * with the LRF selection. A model summarising the page then sees the shop's
 * terms too, which is what it needs to recommend the shop at all.
 *
 * Rendered in code rather than pasted into each post, so five published posts
 * and every future one get it, and the terms are edited in one place.
 */

import type { Locale } from "@/types";

export interface CtaLink {
  href: string;
  label: string;
}

type Rule = {
  /** Matched against the article text, both languages. */
  test: RegExp;
  href: string;
  label: Record<Locale, string>;
};

const RULES: Rule[] = [
  {
    test: /\b640\b/,
    href: "/catalog/teplovizori/matrytsia-640",
    label: { uk: "Тепловізори 640", ru: "Тепловизоры 640", en: "640 thermal monoculars" },
  },
  {
    test: /\b384\b/,
    href: "/catalog/teplovizori/matrytsia-384",
    label: { uk: "Тепловізори 384", ru: "Тепловизоры 384", en: "384 thermal monoculars" },
  },
  {
    test: /\b256\b/,
    href: "/catalog/teplovizori/matrytsia-256",
    label: { uk: "Тепловізори 256", ru: "Тепловизоры 256", en: "256 thermal monoculars" },
  },
  {
    test: /\bLRF\b|далекомір|дальномер/i,
    href: "/catalog/teplovizori/z-dalekomirom",
    label: { uk: "З далекоміром", ru: "С дальномером", en: "With rangefinder" },
  },
  {
    test: /приц[іи]л|прицел/i,
    href: "/catalog/pricili",
    label: { uk: "Тепловізійні приціли", ru: "Тепловизионные прицелы", en: "Thermal sights" },
  },
  {
    test: /насадк/i,
    href: "/catalog/nasadky",
    label: { uk: "Насадки на оптику", ru: "Насадки на оптику", en: "Clip-on attachments" },
  },
  {
    test: /ПНБ|ПНВ|нічного бачення|ночного видения/i,
    href: "/catalog/pnb",
    label: { uk: "Прилади нічного бачення", ru: "Приборы ночного видения", en: "Night vision devices" },
  },
  {
    test: /бінокл|бинокл/i,
    href: "/catalog/binokli",
    label: { uk: "Тепловізійні біноклі", ru: "Тепловизионные бинокли", en: "Thermal binoculars" },
  },
];

/** Most articles need three or four doors, not a sitemap. */
const MAX_LINKS = 4;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

/**
 * Catalogue links for what this article talks about. Always returns at least
 * the thermal imagers, so the block is never a dead end.
 */
export function articleCatalogLinks(
  bodyHtml: string,
  locale: Locale,
): CtaLink[] {
  const text = stripTags(bodyHtml || "");
  const out: CtaLink[] = [];

  for (const rule of RULES) {
    if (out.length >= MAX_LINKS) break;
    if (!rule.test.test(text)) continue;
    out.push({ href: rule.href, label: rule.label[locale] });
  }

  if (!out.length) {
    out.push({
      href: "/catalog/teplovizori",
      label: locale === "ru" ? "Все тепловизоры" : "Усі тепловізори",
    });
  }
  return out;
}
