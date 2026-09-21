import {
  getCategoryBySlug,
  getProductBySlug,
  getRelatedProducts,
  getProductsByFlag,
} from "@/lib/catalog";
import { Link } from "@/i18n/routing";
import {
  categoryName,
  productName,
  productDescription,
  productShort,
  salePercent,
} from "@/types";
import { breadcrumbJsonLd, jsonLdScript, type Crumb } from "@/lib/breadcrumbs";
import { cn, formatPrice } from "@/lib/utils";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import {
  absoluteProductImageUrl,
  resolveProductImageAlt,
} from "@/lib/product-image-alt";
import { getAllPublicSettings } from "@/lib/store-settings";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductSimulatorCta } from "@/components/simulator/SimulatorCta";
import { HowWeWorkCompact } from "@/components/trust/HowWeWork";
import { comparisonsFor } from "@/lib/comparisons";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { PriceCompareSection } from "@/components/product/PriceCompareSection";
import { PRICE_COMPARE_PUBLIC_UI } from "@/lib/price-compare/flags";
import { ProductDescriptionBody } from "@/components/product/ProductDescriptionBody";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductSpecsGrouped } from "@/components/product/ProductSpecsGrouped";
import { ProductCard } from "@/components/ui/ProductCard";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Package } from "lucide-react";
import { buildSpecRows, groupSpecRows, SPEC_SECTION_ORDER } from "@/lib/product-specs";
import { isSpotlightProduct } from "@/lib/spotlight-product";
import { productMetaDescription } from "@/lib/product-meta";
import { pageAlternates } from "@/lib/seo-alternates";
// Live price/stock, and newly imported products must resolve immediately —
// see the catalog page for the Data Cache problem this avoids.
export const dynamic = "force-dynamic";
// force-dynamic alone still let Next reuse Data-Cache entries for the Supabase
// reads, so a page visited before an edit kept replaying the old row (a product
// cleaned in the DB still rendered its removed specs). Route-scoped, so the
// statically rendered pages are unaffected.
export const fetchCache = "force-no-store";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  const loc = locale as "uk" | "ru";
  const name = productName(product, loc);
  const desc = productMetaDescription(product, name, loc);
  const path =
    locale === "ru" ? `/ru/product/${slug}` : `/product/${slug}`;
  const url = absoluteUrl(path);
  const siteUrl = getSiteUrl();
  const ogSrc = product.images[0]
    ? absoluteProductImageUrl(product.images[0], siteUrl)
    : "";
  const ogAlt = resolveProductImageAlt(
    name,
    product.imageAlts,
    0
  );
  return {
    title: name,
    description: desc,
    alternates: pageAlternates(locale, `/product/${slug}`),
    openGraph: {
      title: name,
      description: desc,
      url,
      images: ogSrc
        ? [{ url: ogSrc, alt: ogAlt }]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const t = await getTranslations("product");
  const tn = await getTranslations("nav");
  const loc = locale as "uk" | "ru";
  const name = productName(product, loc);
  const desc = productDescription(product, loc);
  const sale = salePercent(product.price, product.oldPrice);
  const spotlight = isSpotlightProduct(product.slug);

  // Parallel I/O — no price-compare on secondary rails (faster PDP)
  const [related, hitProducts, settings, category] = await Promise.all([
    getRelatedProducts(product, 4),
    getProductsByFlag("hit", 4, { priceCompare: false }),
    getAllPublicSettings(),
    product.categorySlug
      ? getCategoryBySlug(product.categorySlug)
      : Promise.resolve(null),
  ]);
  const boughtWith = hitProducts.filter((p) => p.id !== product.id);
  const siteUrl = getSiteUrl();

  // Real category, not a hardcoded "Тепловізори" — see lib/breadcrumbs.ts.
  const crumbs: Crumb[] = [
    { name: tn("home"), path: "/" },
    ...(category
      ? [{ name: categoryName(category, loc), path: `/catalog/${category.slug}` }]
      : []),
    { name, path: `/product/${product.slug}` },
  ];

  return (
    <div className="container-shop py-6 sm:py-10">
      <ProductJsonLd
        product={product}
        locale={loc}
        siteUrl={siteUrl}
        delivery={settings.delivery}
        // Seed/marketing rating fields are NOT real reviews — omit AggregateRating
        // until a real review source exists (Google policy).
        realReviews={null}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)),
        }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted"
      >
        {crumbs.slice(0, -1).map((c) => (
          <span key={c.path} className="flex items-center gap-2">
            <Link href={c.path} className="hover:text-accent">
              {c.name}
            </Link>
            <span>/</span>
          </span>
        ))}
        <span className="line-clamp-1 text-ink" aria-current="page">
          {name}
        </span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImageGallery
          images={product.images}
          alt={resolveProductImageAlt(name, product.imageAlts, 0)}
          badgesBelowOnMobile
          badges={
            spotlight ? (
              <>
                <span className="label-badge badge-spotlight">
                  {t("spotlightDontMiss")}
                </span>
                {sale != null && sale > 0 ? (
                  <span className="label-badge badge-sale">-{sale}%</span>
                ) : null}
              </>
            ) : (
              <>
                {sale != null && sale > 0 && (
                  <span className="label-badge badge-sale">-{sale}%</span>
                )}
                {product.isHit === true && t("hit") ? (
                  <span className="label-badge badge-hit">{t("hit")}</span>
                ) : null}
                {product.isNew === true && t("new") ? (
                  <span className="label-badge badge-new">{t("new")}</span>
                ) : null}
                {product.isTop === true && !product.isHit && t("top") ? (
                  <span className="label-badge badge-hit">{t("top")}</span>
                ) : null}
                <Link
                  href="/viyskovym"
                  className="label-badge badge-military transition hover:brightness-110"
                  title={t("militaryBadgeHint")}
                >
                  {t("militaryBadge")}
                </Link>
              </>
            )
          }
        />

        <div className={spotlight ? "product-pdp--spotlight" : undefined}>
          {spotlight ? (
            <div className="spotlight-banner mb-4">
              <span className="spotlight-banner__dot" aria-hidden />
              <div>
                <p className="spotlight-banner__title">{t("spotlightUnique")}</p>
                <p className="spotlight-banner__sub">
                  {t("spotlightDontMiss")}
                </p>
              </div>
            </div>
          ) : null}
          {product.brandName && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-ui">
              {product.brandSlug ? (
                <Link
                  href={`/brand/${product.brandSlug}`}
                  className="transition hover:text-[var(--accent)]"
                >
                  {product.brandName}
                </Link>
              ) : (
                product.brandName
              )}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {!spotlight ? (
              <Link
                href="/viyskovym"
                className="label-badge badge-military !static transition hover:brightness-110"
                title={t("militaryBadgeHint")}
              >
                {t("militaryBadge")}
              </Link>
            ) : null}
            {product.sku && (
              <span className="text-muted">
                {t("sku")}: {product.sku}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span
              className={cn(
                "text-3xl font-bold tracking-tight text-price",
                spotlight && "price-pulse-spotlight"
              )}
            >
              {formatPrice(product.price, locale)}
            </span>
            {product.oldPrice != null && product.oldPrice > product.price && (
              <span className="text-lg text-price-old">
                {formatPrice(product.oldPrice, locale)}
              </span>
            )}
          </div>

          <p
            className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${
              product.stock > 0 ? "text-success" : "text-accent"
            }`}
          >
            {product.stock > 0 ? (
              <>
                <Check className="h-4 w-4" />
                {t("inStock")}
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                {t("outOfStock")}
              </>
            )}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            <AddToCartButton
              product={product}
              className="btn-buy min-w-[200px] w-full sm:w-auto"
            />
          </div>

          <ProductSimulatorCta product={product} locale={loc} />
          {comparisonsFor(product.slug).map((c) => {
            const other = c.a.slug === product.slug ? c.b.name : c.a.name;
            return (
              <p key={c.slug} className="mt-3 text-sm text-secondary">
                {loc === "ru" ? "Сравнить с " : "Порівняти з "}
                <Link
                  href={`/porivniannia/${c.slug}`}
                  className="font-semibold text-[var(--accent)] hover:underline"
                >
                  {other} →
                </Link>
              </p>
            );
          })}
          <HowWeWorkCompact locale={loc} />

          {PRICE_COMPARE_PUBLIC_UI && (
            <PriceCompareSection compare={product.priceCompare} locale={locale} />
          )}
          {/* Full text only in «Опис» below — not duplicated under cart */}
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <ProductSpecsGrouped
          heading={t("specs")}
          sections={groupSpecRows(
            buildSpecRows(product.specs, {
              locale: loc,
              resolution: product.resolution,
              detectionRangeM: product.detectionRangeM,
            })
          )}
          titles={Object.fromEntries(
            SPEC_SECTION_ORDER.map((id) => [id, t(`specSections.${id}`)])
          )}
        />

        <section className="product-panel">
          <h2 className="product-panel__title">{t("description")}</h2>
          <ProductDescriptionBody
            text={desc || productShort(product, loc) || ""}
          />
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title mb-6">{t("related")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {boughtWith.length > 0 && (
        <section className="mt-14 mb-4">
          <h2 className="section-title mb-6">{t("boughtWith")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boughtWith.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
