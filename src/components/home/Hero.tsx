import { HeroCarousel } from "@/components/home/HeroCarousel";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";
import { listPublishedPosts } from "@/lib/blog/repo";

/**
 * Hero: pitch + featured blog card (where the simulator used to sit).
 * Simulator entry: header CTA + nav → /simulator.
 */
export async function Hero() {
  const [allBrands, blog] = await Promise.all([
    getBrands(),
    listPublishedPosts({ limit: 6, page: 1 }),
  ]);
  const brands = sortBrandsByPriority(visibleBrandGridBrands(allBrands));
  // Only real published posts (stubs unpublished in DB)
  return <HeroCarousel brands={brands} posts={blog.posts} />;
}
