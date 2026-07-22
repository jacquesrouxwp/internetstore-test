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
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { ProductCard } from "@/components/ui/ProductCard";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star, Check, Package } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  const name = productName(product, locale as "uk" | "ru");
  return {
    title: name,
    description: productShort(product, locale as "uk" | "ru") || name,
    openGraph: {
      title: name,
      description: productShort(product, locale as "uk" | "ru") || undefined,
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
  const related = await getRelatedProducts(product, 4);
  const boughtWith = (await getProductsByFlag("hit", 4)).filter(
    (p) => p.id !== product.id
  );
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://optics-shop-skeleton.vercel.app";

  return (
    <div className="container-shop py-6 sm:py-10">
      <ProductJsonLd product={product} locale={loc} siteUrl={siteUrl} />

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
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0]}
                alt={name}
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-canvas">
                <div className="h-32 w-40 rounded-[2rem] bg-gradient-to-br from-zinc-500 to-zinc-800 shadow-lg">
                  <div className="mx-auto mt-10 h-14 w-14 rounded-full border-2 border-white/80" />
                </div>
              </div>
            )}
            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {sale != null && (
                <span className="label-badge bg-accent text-white">
                  -{sale}%
                </span>
              )}
              {product.isHit && (
                <span className="label-badge bg-ink text-white">{t("hit")}</span>
              )}
              {product.isNew && (
                <span className="label-badge bg-success text-white">
                  {t("new")}
                </span>
              )}
            </div>
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="aspect-square rounded-lg border border-line object-contain p-2"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brandName && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
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

          <div className="mt-8 flex flex-wrap gap-3">
            <AddToCartButton product={product} className="btn-buy min-w-[200px] w-auto" />
          </div>

          {productShort(product, loc) && (
            <p className="product-panel__body mt-8 max-w-xl text-base">
              {productShort(product, loc)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <section className="product-panel">
          <h2 className="product-panel__title">{t("specs")}</h2>
          <table className="product-panel__specs">
            <tbody>
              {Object.entries(product.specs).map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
              {product.resolution && !product.specs["Матриця"] && (
                <tr>
                  <th>Матриця</th>
                  <td>{product.resolution}</td>
                </tr>
              )}
              {product.detectionRangeM != null && (
                <tr>
                  <th>Дальність виявлення людини, м</th>
                  <td>{product.detectionRangeM}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="product-panel">
          <h2 className="product-panel__title">{t("description")}</h2>
          <div className="product-panel__body">
            {(desc || productShort(product, loc) || "")
              .split(/\n\s*\n|\n/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
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
        <section className="mt-14 mb-8">
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
