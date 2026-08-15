import {
  getProductBySlug,
  getRelatedProducts,
  getProductsByFlag,
} from "@/lib/catalog";
import { Link } from "@/i18n/routing";
import {
  productName,
  productDescription,
  productShort,
  salePercent,
} from "@/types";
import { formatPrice } from "@/lib/utils";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { getAllPublicSettings } from "@/lib/store-settings";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { PriceCompareSection } from "@/components/product/PriceCompareSection";
import { PRICE_COMPARE_PUBLIC_UI } from "@/lib/price-compare/flags";
import { ProductDescriptionBody } from "@/components/product/ProductDescriptionBody";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductCard } from "@/components/ui/ProductCard";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star, Check, Package } from "lucide-react";
import { buildSpecRows } from "@/lib/product-specs";
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
  const name = productName(product, locale as "uk" | "ru");
  const desc = productShort(product, locale as "uk" | "ru") || name;
  const path =
    locale === "ru" ? `/ru/product/${slug}` : `/product/${slug}`;
  const url = absoluteUrl(path);
  return {
    title: name,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: name,
      description: desc,
      url,
      images: product.images[0] ? [product.images[0]] : undefined,
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

  // Parallel I/O — no price-compare on secondary rails (faster PDP)
  const [related, hitProducts, settings] = await Promise.all([
    getRelatedProducts(product, 4),
    getProductsByFlag("hit", 4, { priceCompare: false }),
    getAllPublicSettings(),
  ]);
  const boughtWith = hitProducts.filter((p) => p.id !== product.id);
  const siteUrl = getSiteUrl();

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

      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-accent">
          {tn("home")}
        </Link>
        <span>/</span>
        <Link href="/catalog/teplovizori" className="hover:text-accent">
          {tn("thermal")}
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-ink">{name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImageGallery
          images={product.images}
          alt={name}
          badges={
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
            </>
          }
        />

        <div>
          {product.brandName && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-ui">
              {product.brandName}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <strong>{product.rating.toFixed(1)}</strong>
              <span className="text-muted">
                ({product.reviewsCount} {t("reviews")})
              </span>
            </span>
            {product.sku && (
              <span className="text-muted">
                {t("sku")}: {product.sku}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight text-price">
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
                {t("inStock")} ({product.stock})
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

          {PRICE_COMPARE_PUBLIC_UI && (
            <PriceCompareSection compare={product.priceCompare} locale={locale} />
          )}
          {/* Full text only in «Опис» below — not duplicated under cart */}
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <section className="product-panel">
          <h2 className="product-panel__title">{t("specs")}</h2>
          <table className="product-panel__specs">
            <tbody>
              {buildSpecRows(product.specs, {
                locale: loc,
                resolution: product.resolution,
                detectionRangeM: product.detectionRangeM,
              }).map((row) => (
                <tr key={row.key}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

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
