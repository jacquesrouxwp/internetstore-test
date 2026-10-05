import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { pageAlternates } from "@/lib/seo-alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ru"
        ? "Сервис и гарантия"
        : locale === "en"
          ? "Service and warranty"
          : "Сервіс і гарантія",
    description:
      locale === "ru"
        ? "Гарантия производителя, сервис и помощь с настройкой тепловизоров и прицелов в Pro-Optics (Про Оптикс)."
        : locale === "en"
          ? "Manufacturer's warranty, service and help with setting up thermal imagers and sights at Pro-Optics, a specialist shop for thermal and night vision optics."
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
  const loc = locale as Locale;
  const ru = loc === "ru";
  const en = loc === "en";
  // Third argument is optional: a page still being translated falls back to
  // Ukrainian rather than rendering an empty slot.
  const L = (
    uk: React.ReactNode,
    ruText: React.ReactNode,
    enText?: React.ReactNode,
  ): React.ReactNode => (en ? (enText ?? uk) : ru ? ruText : uk);

  return (
    <InfoPage title={t("warrantyTitle")}>
      <InfoPanel>
        <p>{t("warrantyText")}</p>
        <ul>
          <li>
            {L(
              "Допомога з першим налаштуванням і оновленням ПЗ",
              "Помощь с первой настройкой и обновлением ПО",
              "Help with first-time setup and firmware updates",
            )}
          </li>
          <li>
            {L(
              "Консультації з підбору та експлуатації",
              "Консультации по подбору и эксплуатации",
              "Advice on choosing and operating your device",
            )}
          </li>
          <li>
            {L(
              "Післяпродажний сервіс через партнерів",
              "Послепродажный сервис через партнёров",
              "After-sales service through partners",
            )}
          </li>
        </ul>
      </InfoPanel>
    </InfoPage>
  );
}
