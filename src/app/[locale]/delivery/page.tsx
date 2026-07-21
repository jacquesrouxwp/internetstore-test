import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Доставка і оплата" };

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <div className="container-shop max-w-3xl py-12">
      <h1 className="section-title mb-6">{t("deliveryTitle")}</h1>
      <div className="card-surface space-y-6 p-8 text-sm leading-relaxed text-zinc-700">
        <p>{t("deliveryText")}</p>
        <div>
          <h2 className="mb-2 font-semibold text-ink">Нова Пошта</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Доставка 1–2 дні по Україні</li>
            <li>Безкоштовна доставка від 50 000 грн (демо-правило)</li>
            <li>Самовивіз з відділення або поштомат</li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-ink">Оплата</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>При отриманні (накладений платіж)</li>
            <li>Monobank Acquiring</li>
            <li>LiqPay / WayForPay</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
