/**
 * Storefront identity for the public offer and privacy policy pages.
 * Admin → Налаштування → юридичні дані wins; these are the fallbacks used
 * while those fields are still empty (the settings row stores empty strings,
 * which would otherwise shadow the defaults).
 */
export const SELLER = {
  brand: "Pro-Optics",
  site: "pro-optics.com.ua",
  /** Seller as confirmed by the owner; ІПН still to be added in admin */
  legalName: "ФОП Балик Сергій",
  legalAddress: { uk: "Київ, Україна", ru: "Киев, Украина" },
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
