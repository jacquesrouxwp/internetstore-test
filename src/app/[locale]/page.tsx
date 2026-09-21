import { Hero } from "@/components/home/Hero";
import { ProductRail } from "@/components/ui/ProductRail";
import { BrandGrid } from "@/components/ui/BrandGrid";
import { HowWeWork } from "@/components/trust/HowWeWork";
import { SimulatorPromo } from "@/components/simulator/SimulatorCta";
import {
  getProductBySlug,
  getProductsByFlag,
  getBrandsWithProducts,
} from "@/lib/catalog";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { visibleBrandGridBrands } from "@/lib/brand-priority";
import {
  dedupeRails,
  RAIL_FETCH_MULTIPLIER,
  railIsWorthShowing,
  uniqueById,
} from "@/lib/home-rails";
import { pageAlternates } from "@/lib/seo-alternates";

// Rendering the rails, hero and blog shelf takes ~1 s, so the page is cached
// and rebuilt at most once a minute. Blog admin saves revalidate it at once
// (api/admin/news); product changes show up within the minute.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  // `absolute` — the homepage title already leads with the brand, so it must
  // not also receive the "| Pro-Optics" template suffix.
  const title = isRu
    ? "Pro-Optics (Про Оптикс) — тепловизоры, прицелы и ПНВ в Украине"
    : "Pro-Optics (Про Оптікс) — тепловізори, приціли та ПНБ в Україні";
  const description = isRu
    ? "Интернет-магазин Pro-Optics: тепловизоры, тепловизионные прицелы, насадки и приборы ночного видения. Консультация, доставка Новой Почтой по Украине, гарантия."
    : "Інтернет-магазин Pro-Optics: тепловізори, тепловізійні приціли, насадки та прилади нічного бачення. Консультація, доставка Новою Поштою по Україні, гарантія.";
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, "/"),
    openGraph: { title, description, url: pageAlternates(locale, "/").canonical },
  };
}

const RAIL_SIZE = 10;

/**
 * Hand-picked models for the top of the homepage. Slugs, not flags, so the
 * selection is explicit and cannot be shuffled by marketing flags on other
 * products. Anything that fails to resolve is simply skipped.
 * Leonardo DRS IWS first (unique offer), then Merger / AGM Rattler / Adder / PVS.
 */
const FEATURED_SLUGS = [
  "leonardo-drs-iws-teploviziynyy-monokuliar",
  "pulsar-teploviziynyy-binokl-pulsar-merger-lrf-xl50-merger-lrf-xl50",
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
  const [topRaw, hitsRaw, newsRaw, saleRaw, brands, featuredRaw] =
    await Promise.all([
      getProductsByFlag("top", fetchSize),
      getProductsByFlag("hit", fetchSize),
      getProductsByFlag("new", fetchSize),
      getProductsByFlag("sale", fetchSize),
      getBrandsWithProducts(),
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

      <HowWeWork locale={locale as "uk" | "ru"} />
      <SimulatorPromo locale={locale as "uk" | "ru"} />

    </>
  );
}
