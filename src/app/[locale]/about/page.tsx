import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { absoluteUrl } from "@/lib/site-url";
import { Link } from "@/i18n/routing";
import { Shield } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  const title = isRu
    ? "О нас — скидки на тепловизоры для военных | Pro-Optics"
    : "Про нас — знижки на тепловізори для військових | Pro-Optics";
  const description = isRu
    ? "Pro-Optics: профессиональная оптика, тепловизоры и прицелы. Специальные условия и скидки на тепловизоры для военнослужащих ВСУ. Консультация и доставка по Украине."
    : "Pro-Optics: професійна оптика, тепловізори та приціли. Спеціальні умови та знижки на тепловізори для військовослужбовців ЗСУ. Консультація та доставка по Україні.";
  const path = isRu ? "/ru/about" : "/about";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, description, url: absoluteUrl(path) },
  };
}

export default async function AboutPage({ params }: Props) {
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
              Работаем с брендами HikMicro, Pulsar, INFIRAY, PARD, ATN и
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
              Працюємо з брендами HikMicro, Pulsar, INFIRAY, PARD, ATN та
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

      {/* SEO: military discounts on thermal optics */}
      <InfoPanel className="mt-5 sm:mt-6">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.15)] text-[var(--accent)]">
            <Shield className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-primary sm:text-xl">
              {t("aboutMilitaryTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary sm:text-[0.9375rem]">
              {t("aboutMilitaryLead")}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-secondary sm:text-[0.9375rem]">
          {t("aboutMilitaryBody")}
        </p>
        <p className="mt-4">
          <Link
            href="/contacts"
            className="inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            {t("aboutMilitaryCta")} →
          </Link>
        </p>
      </InfoPanel>
    </InfoPage>
  );
}
