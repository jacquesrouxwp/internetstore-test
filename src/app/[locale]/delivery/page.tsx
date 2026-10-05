import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { BrandMark } from "@/components/ui/BrandMark";
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
        ? "Доставка и оплата"
        : locale === "en"
          ? "Delivery and payment"
          : "Доставка і оплата",
    description:
      locale === "ru"
        ? "Доставка Новой Почтой по всей Украине, оплата при получении или онлайн. Условия доставки и оплаты в Pro-Optics (Про Оптикс)."
        : locale === "en"
          ? "Delivery with Nova Poshta across Ukraine, payment on receipt or online. Delivery and payment terms at Pro-Optics, a thermal and night vision optics shop."
          : "Доставка Новою Поштою по всій Україні, оплата при отриманні або онлайн. Умови доставки та оплати в Pro-Optics (Про Оптікс).",
    alternates: pageAlternates(locale, "/delivery"),
  };
}

export default async function DeliveryPage({
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
    <InfoPage title={t("deliveryTitle")}>
      <InfoPanel>
        <p>{t("deliveryText")}</p>

        <h2 className="flex items-center gap-2.5">
          <BrandMark brand="nova-poshta" size="md" />
          <span>{L("Нова Пошта", "Новая Почта", "Nova Poshta")}</span>
        </h2>
        <ul>
          <li>
            {L(
              "Доставка 1–2 дні по Україні",
              "Доставка 1–2 дня по Украине",
              "Delivery in 1–2 days across Ukraine",
            )}
          </li>
          <li>
            {L(
              "Безкоштовна доставка від 50 000 грн",
              "Бесплатная доставка от 50 000 грн",
              "Free delivery from 50,000 UAH",
            )}
          </li>
          <li>
            {L(
              "Самовивіз з відділення або поштомат",
              "Самовывоз из отделения или почтомат",
              "Pick-up from a branch or a parcel locker",
            )}
          </li>
        </ul>
        <h2>{L("Оплата", "Оплата", "Payment")}</h2>
        <ul>
          <li>
            {L(
              "При отриманні (накладений платіж)",
              "При получении (наложенный платёж)",
              "Cash on delivery",
            )}
          </li>
          <li>Monobank Acquiring</li>
          <li>LiqPay / WayForPay</li>
        </ul>
      </InfoPanel>
    </InfoPage>
  );
}
