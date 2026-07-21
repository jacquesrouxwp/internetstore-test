import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Про нас" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <div className="container-shop max-w-3xl py-12">
      <h1 className="section-title mb-6">{t("aboutTitle")}</h1>
      <div className="card-surface space-y-4 p-8 text-sm leading-relaxed text-zinc-700">
        <p>{t("aboutText")}</p>
        <p>
          Працюємо з брендами HikMicro, Pulsar, Rix, INFIRAY, PARD, ATN та
          іншими. Кожен прилад проходить перевірку перед відправкою.
        </p>
        <p>
          Команда консультантів допоможе обрати матрицю, об&apos;єктив і
          бюджет під ваше завдання — полювання, охорона чи спеціальні умови.
        </p>
      </div>
    </div>
  );
}
