import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThermalSandbox } from "@/components/simulator/ThermalSandbox";
import { listThermalCompareOptions } from "@/lib/thermal/list-thermal-products";

// Feature flag: sandbox route disabled site-wide (kept in code, not
// removed, per owner request 2026-08-01) -- 404s while off, even by direct URL.
const SIMULATOR_ENABLED = true;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  return {
    title: isRu
      ? "Симулятор тепловизора — олень"
      : "Симулятор тепловізора — олень",
    description: isRu
      ? "Приблизительная сцена: олень в лесу. Матрица, pitch, NETD, объектив → картинка и дальности DRI."
      : "Приблизна сцена: олень у лісі. Матриця, pitch, NETD, об'єктив → картинка і дальності DRI.",
  };
}

export default async function SimulatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!SIMULATOR_ENABLED) notFound();
  const t = await getTranslations("simulator");
  const presets = await listThermalCompareOptions(locale);

  return (
    <div className="container-shop py-8 sm:py-10">
      <p className="mb-6 text-sm text-secondary">{t("intro")}</p>
      <ThermalSandbox locale={locale} catalogPresets={presets} />
    </div>
  );
}
