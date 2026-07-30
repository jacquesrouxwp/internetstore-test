"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ScanEye, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/types";
import { productName, productShort, salePercent } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { useState } from "react";
import { PriceCompareBadge } from "@/components/product/PriceCompareBadge";
import { ThermalScoreBadge } from "@/components/product/ThermalScorePanel";
import {
  isThermalProduct,
  scoreProduct,
} from "@/lib/thermal/thermal-score";

/**
 * Desktop-only hover: only devices with real hover + fine pointer
 * (mouse/trackpad). Touch phones/tablets skip the "clean photo" effect —
 * a tap simply opens the product page.
 */
const hoverDesk = "[@media(hover:hover)_and_(pointer:fine)]";

function ProductPlaceholder() {
  return (
    <div className="photo-plate flex h-full w-full items-center justify-center">
      <div className="h-16 w-20 rounded-2xl border border-black/10 bg-[#d8d8dc] sm:h-20 sm:w-24">
        <div className="mx-auto mt-5 h-8 w-8 rounded-full border-2 border-white/80 sm:mt-6 sm:h-9 sm:w-9" />
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const t = useTranslations("product");
  const locale = useLocale() as "uk" | "ru";
  const add = useCart((s) => s.add);
  const [toast, setToast] = useState(false);
  const sale = salePercent(product.price, product.oldPrice);
  const name = productName(product, locale);
  const short = productShort(product, locale);
  const thermalScore = isThermalProduct(product)
    ? scoreProduct(product).scores.thermalPerformance
    : null;
  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, locale);
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };

  return (
    <article
      className={cn(
        /* overflow-visible so price-compare popover is not clipped */
        "product-card group relative flex flex-col overflow-visible",
        "active:scale-[0.99]",
        compact && "min-w-[220px] max-w-[260px]"
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className={cn(
          "relative z-10 block aspect-square overflow-hidden photo-plate",
          `${hoverDesk}:group-hover:absolute ${hoverDesk}:group-hover:inset-0`,
          `${hoverDesk}:group-hover:z-20 ${hoverDesk}:group-hover:aspect-auto ${hoverDesk}:group-hover:h-full`
        )}
        aria-label={name}
      >
        <div className="photo-plate relative h-full w-full">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={name}
              className={cn(
                "h-full w-full object-contain p-4 transition-all duration-500 ease-premium",
                `${hoverDesk}:group-hover:p-8 ${hoverDesk}:group-hover:scale-[1.04]`
              )}
            />
          ) : (
            <div
              className={cn(
                "h-full transition-transform duration-500 ease-premium",
                `${hoverDesk}:group-hover:scale-[1.04]`
              )}
            >
              <ProductPlaceholder />
            </div>
          )}

          <div
            className={cn(
              "absolute left-2 top-2 z-[1] flex flex-col gap-1",
              "transition-all duration-250 ease-premium",
              `${hoverDesk}:group-hover:pointer-events-none`,
              `${hoverDesk}:group-hover:-translate-y-1`,
              `${hoverDesk}:group-hover:opacity-0`
            )}
          >
            {sale != null && sale > 0 ? (
              <span className="label-badge badge-sale">-{sale}%</span>
            ) : null}
            {product.isHit === true && t("hit") ? (
              <span className="label-badge badge-hit">{t("hit")}</span>
            ) : null}
            {product.isNew === true && t("new") ? (
              <span className="label-badge badge-new">{t("new")}</span>
            ) : null}
            {product.isTop === true && !product.isHit && t("top") ? (
              <span className="label-badge badge-hit">{t("top")}</span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Meta fades under photo hover; price plate is sibling (z-30) so popover stays opaque */}
      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col px-3.5 pt-3.5 sm:px-4 sm:pt-4",
          "transition-opacity duration-300 ease-premium",
          `${hoverDesk}:group-hover:pointer-events-none`,
          `${hoverDesk}:group-hover:opacity-0`
        )}
      >
        {product.brandName ? (
          <p className="product-card__brand mb-1 text-[11px] font-medium uppercase tracking-wider">
            {product.brandName}
          </p>
        ) : null}
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-primary">
            {name}
          </h3>
        </Link>
        {short && !compact && (
          <p className="mt-1 line-clamp-2 text-xs leading-normal text-secondary">
            {short}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-secondary">
          <span className="inline-flex items-center gap-1">
            <Star
              className="h-3.5 w-3.5 fill-[var(--rating)] text-[var(--rating)]"
            />
            <span className="font-medium text-primary">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-muted-ui">
              ({product.reviewsCount} {t("reviews")})
            </span>
          </span>
          {thermalScore != null && (
            <ThermalScoreBadge score={thermalScore} />
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative z-30 mt-auto px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4",
          "rounded-b-[calc(var(--radius-card)-1px)] bg-[var(--surface)]"
        )}
      >
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <span className="text-lg tracking-tight text-price">
            {formatPrice(product.price, locale)}
          </span>
          {product.oldPrice != null && product.oldPrice > product.price && (
            <span className="text-sm text-price-old">
              {formatPrice(product.oldPrice, locale)}
            </span>
          )}
        </div>
        {product.priceCompare && (
          <div className="mb-3">
            <PriceCompareBadge compare={product.priceCompare} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="btn-buy w-full"
          >
            <ShoppingCart className="btn-buy__icon" strokeWidth={2} />
            <span className="btn-buy__label">{t("buy")}</span>
          </button>
          <Link
            href={`/product/${product.slug}#thermal-simulator`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex w-full min-h-[2.5rem] items-center justify-center gap-1.5 rounded-full border-2 border-[var(--accent)] bg-[rgba(225,29,42,0.12)] px-3 text-sm font-bold tracking-wide text-primary transition hover:bg-[rgba(225,29,42,0.22)]"
            title={t("simulationHint")}
            aria-label={`${t("simulation")}: ${name}`}
          >
            <ScanEye
              className="h-4 w-4 shrink-0 text-[var(--accent)]"
              strokeWidth={2.25}
            />
            <span>{t("simulation")}</span>
          </Link>
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[var(--badge-hit)] px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          ✓
        </div>
      )}
    </article>
  );
}
