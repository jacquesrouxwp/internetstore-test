import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Сервіс" };

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
            <li>Помощь с первой настройкой и обновлением ПО</li>
            <li>Консультации по подбору и эксплуатации</li>
            <li>Послепродажный сервис через партнёров</li>
          </ul>
        ) : (
          <ul>
            <li>Допомога з першим налаштуванням і оновленням ПЗ</li>
            <li>Консультації з підбору та експлуатації</li>
            <li>Післяпродажний сервіс через партнерів</li>
          </ul>
        )}
      </InfoPanel>
    </InfoPage>
  );
}
