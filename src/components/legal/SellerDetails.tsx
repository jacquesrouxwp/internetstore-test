import { SELLER } from "@/lib/legal";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import { getAllPublicSettings, type LegalSettings } from "@/lib/store-settings";

/**
 * Seller block for the legal pages. Legal identity comes from admin →
 * Налаштування → юридичні дані (the same fields the footer and printed
 * invoices use); empty fields are not rendered.
 */
export async function SellerDetails({ locale }: { locale: "uk" | "ru" }) {
  const ru = locale === "ru";
  let legal: Partial<LegalSettings> = {};
  try {
    legal = (await getAllPublicSettings()).legal || {};
  } catch {
    /* settings table unavailable — show the storefront details only */
  }
  const rows: [string, React.ReactNode][] = [
    ["Магазин", `${SELLER.brand} (${SELLER.site})`],
  ];
  const entity = legal.entityName || SELLER.legalName;
  if (entity) rows.push([ru ? "Продавец" : "Продавець", entity]);
  if (legal.edrpou) rows.push([ru ? "Код ЕГРПОУ" : "Код ЄДРПОУ", legal.edrpou]);
  if (legal.ipn) rows.push([ru ? "ИНН" : "ІПН", legal.ipn]);
  rows.push([
    ru ? "Адрес" : "Адреса",
    legal.legalAddress || SELLER.legalAddress[locale] || SELLER.city[locale],
  ]);
  rows.push([
    "Телефон",
    <a key="tel" href={STORE_PHONE_TEL}>
      {STORE_PHONE_DISPLAY}
    </a>,
  ]);
  rows.push([ru ? "График работы" : "Графік роботи", SELLER.hours[locale]]);

  return (
    <ul>
      {rows.map(([label, value]) => (
        <li key={label}>
          <strong>{label}:</strong> {value}
        </li>
      ))}
    </ul>
  );
}
