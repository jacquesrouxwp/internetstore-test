import { SELLER, sellerName } from "@/lib/legal";
import type { Locale } from "@/types";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import { getAllPublicSettings, type LegalSettings } from "@/lib/store-settings";

/**
 * Seller block for the legal pages. Legal identity comes from admin →
 * Налаштування → юридичні дані (the same fields the footer and printed
 * invoices use); empty fields are not rendered.
 */
export async function SellerDetails({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const en = locale === "en";
  const label = (uk: string, ruText: string, enText: string) =>
    en ? enText : ru ? ruText : uk;
  let legal: Partial<LegalSettings> = {};
  try {
    legal = (await getAllPublicSettings()).legal || {};
  } catch {
    /* settings table unavailable — show the storefront details only */
  }
  const rows: [string, React.ReactNode][] = [
    [label("Магазин", "Магазин", "Shop"), `${SELLER.brand} (${SELLER.site})`],
  ];
  const entity = sellerName(locale, legal.entityName);
  if (entity) rows.push([label("Продавець", "Продавец", "Seller"), entity]);
  if (legal.edrpou) {
    rows.push([label("Код ЄДРПОУ", "Код ЕГРПОУ", "EDRPOU code"), legal.edrpou]);
  }
  if (legal.ipn) rows.push([label("ІПН", "ИНН", "Tax number (IPN)"), legal.ipn]);
  rows.push([
    label("Адреса", "Адрес", "Address"),
    legal.legalAddress || SELLER.legalAddress[locale] || SELLER.city[locale],
  ]);
  rows.push([
    label("Телефон", "Телефон", "Phone"),
    <a key="tel" href={STORE_PHONE_TEL}>
      {STORE_PHONE_DISPLAY}
    </a>,
  ]);
  rows.push([label("Графік роботи", "График работы", "Opening hours"), SELLER.hours[locale]]);

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
