import { Hero } from "@/components/home/Hero";
import { ProductRail } from "@/components/ui/ProductRail";
import { BrandGrid } from "@/components/ui/BrandGrid";
import {
  getProductBySlug,
  getProductsByFlag,
  getReviews,
  getBrands,
} from "@/lib/catalog";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { visibleBrandGridBrands } from "@/lib/brand-priority";
import {
  dedupeRails,
  RAIL_FETCH_MULTIPLIER,
  railIsWorthShowing,
  uniqueById,
} from "@/lib/home-rails";

/** Refresh catalog rails periodically */
export const revalidate = 60;

const RAIL_SIZE = 10;

/**
 * Hand-picked models for the top of the homepage. Slugs, not flags, so the
 * selection is explicit and cannot be shuffled by marketing flags on other
 * products. Anything that fails to resolve is simply skipped.
 * AGM-first showcase of popular Rattler / Adder / PVS / Asp.
 */
const FEATURED_SLUGS = [
  "agm-teploviziynyy-prytsil-agm-rattler-v2-35-384-314204550205r331",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-19-256-314218550203r921",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-25-384-314204550204r231",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-35-640-314205550205r361",
  "agm-teploviziynyy-prytsil-agm-adder-v2-35-384-agm-adder-v2-35-384",
  "agm-prylad-nichnoho-bachennia-agm-pvs-14-nw1-pvs-14-nw1",
  "agm-prylad-nichnoho-bachennia-agm-pvs-7-nw1-pvs-7-nw1",
  "agm-teplovizor-agm-asp-micro-tm160-tm160",
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("catalog");

  // Over-fetch: a rail must still fill up after items claimed by earlier rails
  // are dropped, otherwise de-duplication would leave gaps.
  const fetchSize = RAIL_SIZE * RAIL_FETCH_MULTIPLIER;
  const [topRaw, hitsRaw, newsRaw, saleRaw, reviews, brands, featuredRaw] =
    await Promise.all([
      getProductsByFlag("top", fetchSize),
      getProductsByFlag("hit", fetchSize),
      getProductsByFlag("new", fetchSize),
      getProductsByFlag("sale", fetchSize),
      Promise.resolve(getReviews()),
      getBrands(),
      Promise.all(FEATURED_SLUGS.map((s) => getProductBySlug(s))),
    ]);

  const featured = uniqueById(featuredRaw).filter((p) => p.published !== false);
  // One product, one slot on the page — see home-rails.ts for the bug this fixes.
  const [top, hits, news, sale] = dedupeRails(
    [topRaw, hitsRaw, newsRaw, saleRaw],
    RAIL_SIZE,
    featured.map((p) => p.id)
  );

  return (
    <>
      <Hero />

      {featured.length > 0 && (
        <ProductRail
          title={t("featured")}
          products={featured}
          href="/catalog/teplovizori"
          viewAllLabel={t("viewAll")}
        />
      )}

      {railIsWorthShowing(top) && (
        <ProductRail
          title={t("bestsellers")}
          products={top}
          href="/catalog/teplovizori"
          viewAllLabel={t("viewAll")}
        />
      )}

      {railIsWorthShowing(hits) && (
        <ProductRail
          title={t("hits")}
          products={hits}
          href="/catalog/teplovizori"
          viewAllLabel={t("viewAll")}
        />
      )}
      {railIsWorthShowing(news) && (
        <ProductRail
          title={t("new")}
          products={news}
          href="/catalog/teplovizori?sort=newest"
          viewAllLabel={t("viewAll")}
        />
      )}
      {railIsWorthShowing(sale) && (
        <ProductRail
          title={t("sale")}
          products={sale}
          href="/catalog/teplovizori"
          viewAllLabel={t("viewAll")}
        />
      )}

      <BrandGrid
        brands={visibleBrandGridBrands(brands)}
        title={tc("brandsBlock")}
      />

      <section className="py-12">
        <div className="container-shop">
          <h2 className="section-title mb-6">{t("reviews")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 6).map((r) => (
              <article key={r.id} className="card-surface p-5">
                <div className="mb-2 flex gap-0.5" style={{ color: "var(--rating)" }}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mb-3 text-xs font-medium text-muted-ui">
                  {r.productName}
                </p>
                <p className="text-sm leading-relaxed text-secondary">{r.text}</p>
                <p className="mt-4 text-xs text-muted-ui">
                  {r.author} · {r.date}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
