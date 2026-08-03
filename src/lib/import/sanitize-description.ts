/**
 * Strip the donor shop's own marketing out of copied product descriptions.
 *
 * The imported text ends (and sometimes middles) with blocks like
 * "Чому варто купити X в Оптикс-Про? Магазин Optics-Pro є офіційним
 * представником бренду ... Купуючи у нас, ви отримуєте: Гарантію якості ...
 * Швидку логістику ...". Left alone, our storefront names a competitor as the
 * brand's official representative and promises service terms that are not
 * ours to promise.
 *
 * Only whole sentences are dropped, and only when they name the competitor or
 * make a shop-service claim. Product facts are never touched.
 */

const COMPETITOR_PATTERNS: RegExp[] = [
  /optics[\s-]?pro/i,
  /оптикс[\s-]?про/i,
  /optiks[\s-]?pro/i,
];

/**
 * Claims about the selling shop rather than the device. These are promises
 * the donor makes about itself -- delivery speed, own service centre,
 * pre-sale checks -- and repeating them would have us promise the same.
 */
const SHOP_CLAIM_PATTERNS: RegExp[] = [
  /купуючи\s+у\s+нас/i,
  /в\s+нашому\s+інтернет[\s-]?магазин/i,
  /наш\s+інтернет[\s-]?магазин/i,
  /чому\s+варто\s+купити/i,
  /переваги\s+покупки/i,
  /передпродажн/i,
  /офіційн\w*\s+сервіс/i,
  /швидк\w*\s+логістик/i,
  /експертн\w*\s+підтримк/i,
  /гаранті\w*\s+якості/i,
  /наші\s+(фахівці|менеджери|спеціалісти)/i,
  /доставка\s+по\s+україні\s+здійснюється/i,
  /ми\s+(забезпечуємо|пропонуємо|продаємо|гарантуємо|залишаємося)/i,
  /замовлення\s+по[їi]де/i,
  /оплатити\s+покупку/i,
];

/** Split on sentence enders while keeping the punctuation. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type SanitizeResult = {
  text: string;
  removedSentences: string[];
  hadCompetitor: boolean;
};

export function sanitizeDonorDescription(
  input: string | null | undefined
): SanitizeResult {
  const original = (input || "").trim();
  if (!original) {
    return { text: "", removedSentences: [], hadCompetitor: false };
  }

  const hadCompetitor = COMPETITOR_PATTERNS.some((re) => re.test(original));
  const kept: string[] = [];
  const removed: string[] = [];

  for (const sentence of splitSentences(original)) {
    const isCompetitor = COMPETITOR_PATTERNS.some((re) => re.test(sentence));
    const isShopClaim = SHOP_CLAIM_PATTERNS.some((re) => re.test(sentence));
    if (isCompetitor || isShopClaim) removed.push(sentence);
    else kept.push(sentence);
  }

  // Trailing colon or dangling connector left by a removed lead-in sentence.
  let text = kept.join(" ").replace(/\s+/g, " ").trim();
  text = text.replace(/[\s,;:—-]+$/g, "").trim();

  return { text, removedSentences: removed, hadCompetitor };
}

/** True when any competitor reference survives -- used as a safety assertion. */
export function hasCompetitorMention(text: string | null | undefined): boolean {
  const s = text || "";
  return COMPETITOR_PATTERNS.some((re) => re.test(s));
}
