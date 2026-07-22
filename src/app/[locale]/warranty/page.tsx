import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Гарантія та сервіс" };

export default async function WarrantyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  const isRu = locale === "ru";

  return (
    <InfoPage title={t("warrantyTitle")}>
      <InfoPanel>
        <p>{t("warrantyText")}</p>
        {isRu ? (
          <ul>
            <li>Официальная гарантия производителя от 12 до 36 месяцев</li>
            <li>Помощь с первой настройкой и обновлением ПО</li>
            <li>Послегарантийный сервис через партнёров</li>
          </ul>
        ) : (
          <ul>
            <li>Офіційна гарантія виробника від 12 до 36 місяців</li>
            <li>Допомога з першим налаштуванням і оновленням ПЗ</li>
            <li>Післягарантійний сервіс через партнерів</li>
          </ul>
        )}
      </InfoPanel>
    </InfoPage>
  );
}
