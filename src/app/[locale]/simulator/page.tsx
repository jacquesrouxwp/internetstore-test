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
      ? "Песочница тепловизора — конструктор DRI"
      : "Пісочниця тепловізора — конструктор DRI",
    description: isRu
      ? "Задайте матрицу, pitch, NETD и объектив — расчёт FOV, IFOV, дальностей Джонсона и живая сцена."
      : "Задайте матрицю, pitch, NETD і об'єктив — розрахунок FOV, IFOV, дальностей Джонсона і жива сцена.",
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
