import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Гарантія та сервіс" };

export default async function WarrantyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <div className="container-shop max-w-3xl py-12">
      <h1 className="section-title mb-6">{t("warrantyTitle")}</h1>
      <div className="card-surface space-y-4 p-8 text-sm leading-relaxed text-zinc-700">
        <p>{t("warrantyText")}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Офіційна гарантія виробника від 12 до 36 місяців</li>
          <li>Допомога з першим налаштуванням і оновленням ПЗ</li>
          <li>Післягарантійний сервіс через партнерів</li>
        </ul>
      </div>
    </div>
  );
}
