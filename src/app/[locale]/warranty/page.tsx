import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { pageAlternates } from "@/lib/seo-alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  return {
    title: isRu ? "Сервис и гарантия" : "Сервіс і гарантія",
    description: isRu
      ? "Гарантия производителя, сервис и помощь с настройкой тепловизоров и прицелов в Pro-Optics (Про Оптикс)."
      : "Гарантія виробника, сервіс і допомога з налаштуванням тепловізорів та прицілів у Pro-Optics (Про Оптікс).",
    alternates: pageAlternates(locale, "/warranty"),
  };
}

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
