import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { absoluteUrl } from "@/lib/site-url";
import { pageAlternates } from "@/lib/seo-alternates";
import { Link } from "@/i18n/routing";
import { Shield } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "ru"
      ? "О нас — поддержка защитников Украины | Pro-Optics"
      : locale === "en"
        ? "About us — supporting the defenders of Ukraine | Pro-Optics"
        : "Про нас — підтримка захисників України | Pro-Optics";
  const description =
    locale === "ru"
      ? "Pro-Optics: профессиональная оптика. Специальные условия и скидка для военнослужащих ВСУ, НГУ, ГПСУ и ТрО на тепловизоры, ПНВ и прицелы. Консультация и доставка по Украине."
      : locale === "en"
        ? "Pro-Optics: professional optics. A discount for the Armed Forces, National Guard, Border Guard and territorial defence on thermal imagers and night vision."
        : "Pro-Optics: професійна оптика. Спеціальні умови та знижка для військовослужбовців ЗСУ, НГУ, ДПСУ та ТрО на тепловізори, ПНБ і приціли. Консультація та доставка по Україні.";
  const path =
    locale === "ru" ? "/ru/about" : locale === "en" ? "/en/about" : "/about";
  return {
    // `absolute`: the title already ends in "| Pro-Optics"; the root template
    // would append it a second time.
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, "/about"),
    openGraph: { title, description, url: absoluteUrl(path) },
  };
}

export default async function AboutPage({ params }: Props) {
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
    <InfoPage title={t("aboutTitle")}>
      <InfoPanel>
        <p>{t("aboutText")}</p>
        <p>
          {L(
            "Працюємо з брендами HikMicro, Pulsar, INFIRAY, PARD, ATN та іншими. Кожен прилад проходить перевірку перед відправкою.",
            "Работаем с брендами HikMicro, Pulsar, INFIRAY, PARD, ATN и другими. Каждый прибор проходит проверку перед отправкой.",
            "We work with HikMicro, Pulsar, INFIRAY, PARD, ATN and other brands. Every device is checked before it ships.",
          )}
        </p>
        <p>
          {L(
            "Команда консультантів допоможе обрати матрицю, об'єктив і бюджет під ваше завдання — полювання, охорона чи спеціальні умови.",
            "Команда консультантов поможет выбрать матрицу, объектив и бюджет под вашу задачу — охота, охрана или специальные условия.",
            "Our team of consultants will help you choose the sensor, lens and budget for your task — hunting, security or special conditions.",
          )}
        </p>
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
              {L("Спеціальні умови", "Специальные условия", "Special terms")}
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
            href="/viyskovym"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover,#c41824)]"
          >
            {L(
              "Умови для військових",
              "Условия для военных",
              "Terms for the military",
            )}
          </Link>
          <Link
            href="/contacts"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            {t("aboutMilitaryCta")}
          </Link>
          <Link
            href="/catalog/teplovizori"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            {L(
              "Каталог тепловізорів",
              "Каталог тепловизоров",
              "Thermal imager catalogue",
            )}
          </Link>
        </div>
      </InfoPanel>
    </InfoPage>
  );
}
