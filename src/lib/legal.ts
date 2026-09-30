import type { Locale } from "@/types";

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
  legalName: {
    uk: "ФОП Балик Сергій",
    ru: "ФОП Балик Сергей",
    // The registry entry is Ukrainian; an English page transliterates it.
    en: "FOP Balyk Serhii (sole proprietor)",
  },
  legalAddress: { uk: "Київ, Україна", ru: "Киев, Украина", en: "Kyiv, Ukraine" },
  city: { uk: "Київ, Україна", ru: "Киев, Украина", en: "Kyiv, Ukraine" },
  hours: {
    uk: "Пн–Пт 9:00–18:00, Сб 12:00–15:00",
    ru: "Пн–Пт 9:00–18:00, Сб 12:00–15:00",
    en: "Mon–Fri 9:00–18:00, Sat 12:00–15:00",
  },
};

/**
 * Seller name for the storefront: the admin field wins when it is filled,
 * otherwise the localized default above (the settings row stores empty
 * strings, so a blank value must not shadow it).
 */
export function sellerName(
  locale: Locale,
  fromSettings?: string | null,
): string {
  const custom = (fromSettings || "").trim();
  return custom || SELLER.legalName[locale];
}

/** Date shown as "last updated" on the legal pages (YYYY-MM-DD). */
export const LEGAL_UPDATED = "2026-09-21";

export function legalUpdatedLabel(locale: Locale): string {
  const [y, m, d] = LEGAL_UPDATED.split("-");
  const label =
    locale === "ru"
      ? "Редакция от"
      : locale === "en"
        ? "Version of"
        : "Редакція від";
  return `${label} ${d}.${m}.${y}`;
}
