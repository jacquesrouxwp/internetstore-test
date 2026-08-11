import { getLocale } from "next-intl/server";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";

/**
 * Hero: pitch + marquee.
 * Desktop: live thermal sim in right column (no carousel).
 * Mobile: side tab → /simulator.
 */
export async function Hero() {
  const locale = await getLocale();
  void locale;
  const allBrands = await getBrands();
  const brands = sortBrandsByPriority(visibleBrandGridBrands(allBrands));
  return <HeroCarousel brands={brands} />;
}
