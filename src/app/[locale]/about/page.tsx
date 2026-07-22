import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Про нас" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  const isRu = locale === "ru";

  return (
    <InfoPage title={t("aboutTitle")}>
      <InfoPanel>
        <p>{t("aboutText")}</p>
        {isRu ? (
          <>
            <p>
              Работаем с брендами HikMicro, Pulsar, Rix, INFIRAY, PARD, ATN и
              другими. Каждый прибор проходит проверку перед отправкой.
            </p>
            <p>
              Команда консультантов поможет выбрать матрицу, объектив и бюджет
              под вашу задачу — охота, охрана или специальные условия.
            </p>
          </>
        ) : (
          <>
            <p>
              Працюємо з брендами HikMicro, Pulsar, Rix, INFIRAY, PARD, ATN та
              іншими. Кожен прилад проходить перевірку перед відправкою.
            </p>
            <p>
              Команда консультантів допоможе обрати матрицю, об&apos;єктив і
              бюджет під ваше завдання — полювання, охорона чи спеціальні
              умови.
            </p>
          </>
        )}
      </InfoPanel>
    </InfoPage>
  );
}
