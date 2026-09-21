import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThermalSandbox } from "@/components/simulator/ThermalSandbox";
import { pageAlternates } from "@/lib/seo-alternates";
import { simulatorPresetFromQuery } from "@/lib/thermal/simulator-link";

// Feature flag: sandbox route disabled site-wide (kept in code, not
// removed, per owner request 2026-08-01) -- 404s while off, even by direct URL.
const SIMULATOR_ENABLED = true;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  return {
    title: isRu
      ? "Симулятор тепловизора онлайн — как видят матрицы 256, 384, 640"
      : "Симулятор тепловізора онлайн — як бачать матриці 256, 384, 640",
    description: isRu
      ? "Бесплатный онлайн-симулятор: меняйте матрицу, объектив, pixel pitch и NETD и смотрите, как тепловизор видит оленя на разных дистанциях, с расчётом дальностей обнаружения."
      : "Безкоштовний онлайн-симулятор: змінюйте матрицю, об'єктив, pixel pitch і NETD та дивіться, як тепловізор бачить оленя на різних дистанціях, з розрахунком дальностей виявлення.",
    alternates: pageAlternates(locale, "/simulator"),
  };
}

export default async function SimulatorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  // Product cards link here with ?res=&pitch=&lens=&netd= — start from that device
  const preset = simulatorPresetFromQuery(await searchParams);
  setRequestLocale(locale);
  if (!SIMULATOR_ENABLED) notFound();
  const t = await getTranslations("simulator");

  return (
    <div className="container-shop py-8 sm:py-10">
      <p className="mb-6 text-sm text-secondary">{t("intro")}</p>
      <ThermalSandbox locale={locale} preset={preset} />
    </div>
  );
}
