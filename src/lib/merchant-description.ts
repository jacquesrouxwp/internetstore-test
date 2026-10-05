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
 * The sentence is useful to a buyer, so it stays on the site. It simply does
 * not go to Google: this strips any sentence carrying the vocabulary and, when
 * too little is left to be worth sending, hands back nothing so the caller can
 * fall back to a summary built from the spec sheet.
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
export function stripWeaponSentences(description: string): SanitizeResult {
  const parts = sentences(description || "");
  const kept = parts.filter((s) => !WEAPON_WORDS.test(s));
  return {
    text: kept.join(" ").replace(/\s+/g, " ").trim(),
    removed: parts.length - kept.length,
  };
}

/** True when the text still carries vocabulary Google refuses. */
export function mentionsWeapon(text: string): boolean {
  return WEAPON_WORDS.test(text || "");
}
