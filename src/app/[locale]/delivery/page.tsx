import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { BrandMark } from "@/components/ui/BrandMark";
import { pageAlternates } from "@/lib/seo-alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  return {
    title: isRu ? "Доставка и оплата" : "Доставка і оплата",
    description: isRu
      ? "Доставка Новой Почтой по всей Украине, оплата при получении или онлайн. Условия доставки и оплаты в Pro-Optics (Про Оптикс)."
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
  const isRu = locale === "ru";

  return (
    <InfoPage title={t("deliveryTitle")}>
      <InfoPanel>
        <p>{t("deliveryText")}</p>

        {isRu ? (
          <>
            <h2 className="flex items-center gap-2.5">
              <BrandMark brand="nova-poshta" size="md" />
              <span>Новая Почта</span>
            </h2>
            <ul>
              <li>Доставка 1–2 дня по Украине</li>
              <li>Бесплатная доставка от 50 000 грн</li>
              <li>Самовывоз из отделения или почтомат</li>
            </ul>
            <h2>Оплата</h2>
            <ul>
              <li>При получении (наложенный платёж)</li>
              <li>Monobank Acquiring</li>
              <li>LiqPay / WayForPay</li>
            </ul>
          </>
        ) : (
          <>
            <h2 className="flex items-center gap-2.5">
              <BrandMark brand="nova-poshta" size="md" />
              <span>Нова Пошта</span>
            </h2>
            <ul>
              <li>Доставка 1–2 дні по Україні</li>
              <li>Безкоштовна доставка від 50 000 грн</li>
              <li>Самовивіз з відділення або поштомат</li>
            </ul>
            <h2>Оплата</h2>
            <ul>
              <li>При отриманні (накладений платіж)</li>
              <li>Monobank Acquiring</li>
              <li>LiqPay / WayForPay</li>
            </ul>
          </>
        )}
      </InfoPanel>
    </InfoPage>
  );
}
