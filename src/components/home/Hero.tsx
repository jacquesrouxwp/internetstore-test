import { getTranslations, getLocale } from "next-intl/server";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";
import { listThermalCompareOptions } from "@/lib/thermal/list-thermal-products";

/**
 * Hero: pitch + brand marquee; thermal sandbox on the right (desktop)
 * or via horizontal swipe (mobile).
 */
export async function Hero() {
  const t = await getTranslations("home");
  const locale = await getLocale();

  const [allBrands, presets] = await Promise.all([
    getBrands(),
    listThermalCompareOptions(locale),
  ]);

  const brands = sortBrandsByPriority(visibleBrandGridBrands(allBrands));

  // touch labels so next-intl keeps keys if used only in client
  void t;

  return (
    <HeroCarousel brands={brands} locale={locale} presets={presets} />
  );
}
