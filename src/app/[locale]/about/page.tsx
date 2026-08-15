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
    ? "О нас — поддержка защитников Украины | Pro-Optics"
    : "Про нас — підтримка захисників України | Pro-Optics";
  const description = isRu
    ? "Pro-Optics: профессиональная оптика. Специальные условия и скидка для военнослужащих ВСУ, НГУ, ГПСУ и ТрО на тепловизоры, ПНВ и прицелы. Консультация и доставка по Украине."
    : "Pro-Optics: професійна оптика. Спеціальні умови та знижка для військовослужбовців ЗСУ, НГУ, ДПСУ та ТрО на тепловізори, ПНБ і приціли. Консультація та доставка по Україні.";
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

      {/* Anchor for product badges: /about#military-support */}
      <InfoPanel
        id="military-support"
        className="mt-5 scroll-mt-24 sm:mt-6 sm:scroll-mt-28"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.16)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
            <Shield className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              {isRu ? "Специальные условия" : "Спеціальні умови"}
            </p>
            <h2
              id="military-support-heading"
              className="font-display text-xl font-bold tracking-tight text-primary sm:text-2xl"
            >
              {t("aboutMilitaryTitle")}
            </h2>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-secondary sm:text-[0.9375rem] sm:leading-relaxed">
          <p className="text-primary/95">{t("aboutMilitaryP1")}</p>
          <p>{t("aboutMilitaryP2")}</p>
          <p>{t("aboutMilitaryP3")}</p>
          <p className="font-semibold text-primary">{t("aboutMilitaryGlory")}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/contacts"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover,#c41824)]"
          >
            {t("aboutMilitaryCta")}
          </Link>
          <Link
            href="/catalog/teplovizori"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            {isRu ? "Каталог тепловизоров" : "Каталог тепловізорів"}
          </Link>
        </div>
      </InfoPanel>
    </InfoPage>
  );
}
