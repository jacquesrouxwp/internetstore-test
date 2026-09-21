/**
 * Seller identity for the public offer and privacy policy pages.
 *
 * The legal fields are empty until the owner provides them (ФОП/ТОВ name,
 * ІПН/ЄДРПОУ, registered address) — empty fields are simply not rendered,
 * so fill them here and both pages pick them up. Google Merchant Center and
 * the Law of Ukraine "On E-Commerce" expect them on the site.
 */
export const SELLER = {
  brand: "Pro-Optics",
  site: "pro-optics.com.ua",
  /** e.g. "ФОП Прізвище Ім'я По батькові" / "ТОВ «…»" */
  legalName: "",
  /** ІПН (ФОП) or код ЄДРПОУ (ТОВ) */
  taxId: "",
  /** Registered address */
  address: "",
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
