import type { Locale, Product } from "@/types";
import { productDescription } from "@/types";
import {
  ACCESSORY_SLUG,
  isMerchantEligible,
  merchantItemId,
} from "@/lib/merchant-eligibility";

/**
 * Weapon vocabulary must not travel into the Merchant Center feed.
 *
 * Google refuses firearms and their parts, and it reads the description, not
 * only the product. The account was suspended over this in September and
 * cleared on the 27th by removing the scopes from the feed — at which point
 * zero of the 494 remaining descriptions mentioned a weapon.
 *
 * The description rewrite of 2 October put the vocabulary back: 370 of 494
 * descriptions now mention a sight, shooting or a rail, because a monocular's
 * text explains what it is *not* for ("для стрільби цього формфактора
 * недостатньо — потрібен тепловізійний приціл"). Google read that and
 * disapproved 15 observation devices under the firearms policy.
 *
 * This strips any sentence carrying the vocabulary and, when too little is
 * left to be worth sending, hands back nothing so the caller can fall back to
 * a summary built from the spec sheet.
 *
 * The feed alone was not enough. Google reviews the landing page too, and on
 * 5 October, with the feed already clean, the pages of the 15 disapproved
 * monoculars still said "Для стрільби цього формфактора недостатньо" and that
 * the device "сяде в рюкзак чи на зброю" — 378 of the 494 feed products
 * carried such sentences. So the pages of feed products drop them as well;
 * see productPageDescription below.
 */

const WEAPON_WORDS = new RegExp(
  [
    "зброй",
    "зброї",
    "зброю",
    "зброя",
    "оруж",
    "приц[іи]л",
    "прицел",
    "стр[іи]льб",
    "стрельб",
    "постр[іи]л",
    "выстрел",
    "в[іи]ддач",
    "отдач",
    "кронштейн",
    "кр[іи]плен",
    "креплен",
    "планк",
    "рейк",
    "weaver",
    "picatinny",
    "п[іи]катін",
    "пикатин",
    "насадк",
    "кал[іи]бр",
    "калибр",
    "карабін",
    "карабин",
    "рушниц",
    "ружь",
    "ружей",
  ].join("|"),
  "i",
);

/**
 * The narrower set: words that name a weapon or its use, without the mounting
 * vocabulary. An accessory page is held to this one — "кріплення" on a helmet
 * adapter is what the product is, while "сяде … на зброю" on a battery pack is
 * the same generator phrase that sits on the monoculars.
 */
const WEAPON_USE = new RegExp(
  [
    "зброй",
    "зброї",
    "зброю",
    "зброя",
    "оруж",
    "приц[іи]л",
    "прицел",
    "стр[іи]льб",
    "стрельб",
    "постр[іи]л",
    "выстрел",
    "в[іи]ддач",
    "отдач",
    "насадк",
    "кал[іи]бр",
    "калибр",
    "ц[іи]вц",
    "цевь",
    "карабін",
    "карабин",
    "рушниц",
    "ружь",
    "ружей",
  ].join("|"),
  "i",
);

/** Below this a description is not worth sending — the caller builds its own. */
export const MIN_FEED_DESCRIPTION = 200;

/**
 * Splits on sentence ends while keeping the terminator, so rejoining does not
 * lose punctuation. Bullet separators count as boundaries too — the generated
 * texts use them.
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?•;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SanitizeResult {
  text: string;
  /** How many sentences were dropped — worth logging, not worth hiding. */
  removed: number;
}

/** Drops every sentence that mentions a weapon, a sight or a mount. */
export function stripWeaponSentences(
  description: string,
  vocabulary: RegExp = WEAPON_WORDS,
): SanitizeResult {
  const parts = sentences(description || "");
  const kept = parts.filter((s) => !vocabulary.test(s));
  return {
    text: kept.join(" ").replace(/\s+/g, " ").trim(),
    removed: parts.length - kept.length,
  };
}

/** True when the text still carries vocabulary Google refuses. */
export function mentionsWeapon(text: string): boolean {
  return WEAPON_WORDS.test(text || "");
}

/** True when the text names a weapon or shooting — the accessory standard. */
export function mentionsWeaponUse(text: string): boolean {
  return WEAPON_USE.test(text || "");
}

/**
 * The same filter for a product page, which renders line breaks: each line is
 * cleaned on its own, a line left empty disappears with its break, and a
 * blank line between paragraphs stays.
 */
export function stripWeaponSentencesKeepingParagraphs(
  text: string,
  vocabulary: RegExp = WEAPON_WORDS,
): string {
  const out: string[] = [];
  for (const line of (text || "").split("\n")) {
    if (!line.trim()) {
      out.push("");
      continue;
    }
    const kept = stripWeaponSentences(line, vocabulary).text;
    if (kept) out.push(kept);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * The description a product page shows and puts into its JSON-LD.
 *
 * A product Google is offered loses its weapon sentences here, so the page
 * agrees with the feed: an observation device loses every one of them, an
 * accessory only those that name a weapon or shooting (see WEAPON_USE).
 * Everything outside the feed keeps its text as written — on a sight or a
 * clip-on those words are the point.
 *
 * The stored description is not touched — rewriting it is the job of the
 * description work, and this keeps the page safe until then.
 */
export function productPageDescription(product: Product, locale: Locale): string {
  const text = productDescription(product, locale);
  if (!isMerchantEligible(product, merchantItemId(product))) return text;
  const accessory = (product.categorySlug || "").toLowerCase() === ACCESSORY_SLUG;
  return stripWeaponSentencesKeepingParagraphs(
    text,
    accessory ? WEAPON_USE : WEAPON_WORDS,
  );
}
