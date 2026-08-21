import { HeroCarousel } from "@/components/home/HeroCarousel";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";

/**
 * Hero: pitch + marquee.
 * Simulator entry points: nav «Симулятор тепловізора» → /simulator, product pages.
 */
export async function Hero() {
  const allBrands = await getBrands();
  const brands = sortBrandsByPriority(visibleBrandGridBrands(allBrands));
  return <HeroCarousel brands={brands} />;
}
