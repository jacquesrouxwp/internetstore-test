/**
 * Storefront identity for the public offer and privacy policy pages.
 * The seller's legal details (ФОП/ТОВ, ЄДРПОУ, ІПН, address) are NOT kept
 * here — they are edited in admin → Налаштування → юридичні дані and read by
 * SellerDetails, so the owner can fill them in without a deploy.
 */
export const SELLER = {
  brand: "Pro-Optics",
  site: "pro-optics.com.ua",
  city: { uk: "Київ, Україна", ru: "Киев, Украина" },
  hours: {
    uk: "Пн–Пт 9:00–18:00, Сб 12:00–15:00",
    ru: "Пн–Пт 9:00–18:00, Сб 12:00–15:00",
  },
};

/** Date shown as "last updated" on the legal pages (YYYY-MM-DD). */
export const LEGAL_UPDATED = "2026-09-21";

export function legalUpdatedLabel(locale: "uk" | "ru"): string {
  const [y, m, d] = LEGAL_UPDATED.split("-");
  return `${locale === "ru" ? "Редакция от" : "Редакція від"} ${d}.${m}.${y}`;
}
