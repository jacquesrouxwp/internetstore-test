import { SELLER } from "@/lib/legal";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";

/** Seller block for the legal pages — legal fields render once filled in. */
export function SellerDetails({ locale }: { locale: "uk" | "ru" }) {
  const ru = locale === "ru";
  const rows: [string, React.ReactNode][] = [
    [ru ? "Магазин" : "Магазин", `${SELLER.brand} (${SELLER.site})`],
    ...(SELLER.legalName
      ? [[ru ? "Продавец" : "Продавець", SELLER.legalName] as [string, string]]
      : []),
    ...(SELLER.taxId
      ? [[ru ? "ИНН / ЕГРПОУ" : "ІПН / ЄДРПОУ", SELLER.taxId] as [string, string]]
      : []),
    [
      ru ? "Адрес" : "Адреса",
      SELLER.address || SELLER.city[locale],
    ],
    [
      ru ? "Телефон" : "Телефон",
      <a key="tel" href={STORE_PHONE_TEL}>
        {STORE_PHONE_DISPLAY}
      </a>,
    ],
    [ru ? "График работы" : "Графік роботи", SELLER.hours[locale]],
  ];
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
