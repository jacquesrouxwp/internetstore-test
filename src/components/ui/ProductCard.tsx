"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ScanEye, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/types";
import {
  productCardTitle,
  productName,
  productShort,
  salePercent,
} from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { useContext, useState } from "react";
import { PriceCompareBadge } from "@/components/product/PriceCompareBadge";
import { LayoutModeContext } from "@/components/ui/animated-toggle-layout-container";
import { PRICE_COMPARE_PUBLIC_UI } from "@/lib/price-compare/flags";
import { resolveProductImageAlt } from "@/lib/product-image-alt";

/**
 * Desktop-only hover: only devices with real hover + fine pointer
 * (mouse/trackpad). Touch phones/tablets skip the "clean photo" effect —
 * a tap simply opens the product page.
 */
const hoverDesk = "[@media(hover:hover)_and_(pointer:fine)]";

// No simulator CTA on product cards (hero + /simulator only).
const SIMULATOR_LINK_ENABLED = false;

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
  const cardTitle = productCardTitle(product, locale);
  const short = productShort(product, locale);
  const layoutMode = useContext(LayoutModeContext);
  /** 6-up → slightly tighter cards */
  const tight = layoutMode === "6col";
  /** No ultra-tiny 8-col mode anymore */
  const ultraTight = false;
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
        "product-card group relative flex h-full w-full min-w-0 flex-col overflow-visible",
        "active:scale-[0.99]",
        compact && "max-w-none",
        tight && "product-card--tight",
        ultraTight && "product-card--ultra"
      )}
      data-layout={layoutMode}
    >
      <Link
        href={`/product/${product.slug}`}
        prefetch
        className={cn(
          "relative z-10 block aspect-square overflow-hidden photo-plate",
          `${hoverDesk}:group-hover:absolute ${hoverDesk}:group-hover:inset-0`,
          `${hoverDesk}:group-hover:z-20 ${hoverDesk}:group-hover:aspect-auto ${hoverDesk}:group-hover:h-full`
        )}
        aria-label={cardTitle}
      >
        <div className="photo-plate relative h-full w-full">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={resolveProductImageAlt(name, product.imageAlts, 0)}
              loading="lazy"
              decoding="async"
              className={cn(
                "h-full w-full object-contain transition-all duration-500 ease-premium",
                ultraTight
                  ? "p-0.5 sm:p-2"
                  : tight
                    ? "p-1.5 sm:p-2.5"
                    : "p-4",
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

          {/* Military badge on the PHOTO only (not whole card) — fixes green text over price on mobile */}
          {!ultraTight ? (
            <span
              className={cn(
                "pointer-events-none absolute bottom-2 left-2 z-[2] label-badge badge-military max-w-[calc(100%-1rem)] truncate",
                tight ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
                "transition-all duration-250 ease-premium",
                `${hoverDesk}:group-hover:pointer-events-none`,
                `${hoverDesk}:group-hover:opacity-0`
              )}
              title={t("militaryBadgeHint")}
            >
              {t("militaryBadge")}
            </span>
          ) : null}
        </div>
      </Link>

      {/* Meta fades under photo hover; price plate is sibling (z-30) so popover stays opaque */}
      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col transition-opacity duration-300 ease-premium",
          ultraTight
            ? "px-1 pt-1 sm:px-2.5 sm:pt-2.5"
            : tight
              ? "px-1.5 pt-1.5 sm:px-3 sm:pt-3"
              : "px-3.5 pt-3.5 sm:px-4 sm:pt-4",
          `${hoverDesk}:group-hover:pointer-events-none`,
          `${hoverDesk}:group-hover:opacity-0`
        )}
      >
        {product.brandName && !ultraTight ? (
          <p
            className={cn(
              "product-card__brand mb-0.5 font-medium uppercase tracking-wider",
              tight ? "text-[9px] sm:text-[11px]" : "text-[11px]"
            )}
          >
            {product.brandName}
          </p>
        ) : null}
        <Link href={`/product/${product.slug}`}>
          <h3
            className={cn(
              "line-clamp-2 font-semibold leading-snug text-primary",
              ultraTight
                ? "min-h-0 text-[9px] leading-tight sm:text-xs"
                : tight
                  ? "min-h-0 text-[11px] sm:min-h-[2.5rem] sm:text-sm"
                  : "min-h-[2.5rem] text-sm"
            )}
          >
            {cardTitle}
          </h3>
        </Link>
        {short && !compact && !tight && (
          <p className="mt-1 line-clamp-2 text-xs leading-normal text-secondary">
            {short}
          </p>
        )}

        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-1 text-secondary",
            ultraTight
              ? "text-[9px]"
              : tight
                ? "mt-1.5 text-[10px] sm:text-xs"
                : "mt-2 gap-2 text-xs"
          )}
        >
          {!ultraTight && (
            <span className="inline-flex items-center gap-0.5">
              <Star
                className={cn(
                  "fill-[var(--rating)] text-[var(--rating)]",
                  tight ? "h-3 w-3" : "h-3.5 w-3.5"
                )}
              />
              <span className="font-medium text-primary">
                {product.rating.toFixed(1)}
              </span>
              {!tight && (
                <span className="text-muted-ui">
                  ({product.reviewsCount} {t("reviews")})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative z-30 mt-auto rounded-b-[calc(var(--radius-card)-1px)] bg-[var(--surface)]",
          ultraTight
            ? "px-1 pb-1 pt-1 sm:px-2 sm:pb-2"
            : tight
              ? "px-1.5 pb-1.5 pt-1.5 sm:px-3 sm:pb-3 sm:pt-2"
              : "px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4"
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-baseline gap-0.5",
            ultraTight ? "mb-1" : tight ? "mb-1.5 gap-1" : "mb-2 gap-2"
          )}
        >
          <span
            className={cn(
              "tracking-tight text-price",
              ultraTight
                ? "text-[10px] leading-none sm:text-sm"
                : tight
                  ? "text-sm sm:text-lg"
                  : "text-lg"
            )}
          >
            {formatPrice(product.price, locale)}
          </span>
          {product.oldPrice != null &&
            product.oldPrice > product.price &&
            !ultraTight && (
              <span
                className={cn(
                  "text-price-old",
                  tight ? "text-[10px]" : "text-sm"
                )}
              >
                {formatPrice(product.oldPrice, locale)}
              </span>
            )}
        </div>
        {PRICE_COMPARE_PUBLIC_UI && product.priceCompare && !tight && (
          <div className="mb-3">
            <PriceCompareBadge compare={product.priceCompare} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className={cn(
              "btn-buy w-full",
              tight && "btn-buy--compact text-[11px]",
              ultraTight && "px-1 py-1.5 text-[9px] leading-none"
            )}
          >
            {!ultraTight && (
              <ShoppingCart className="btn-buy__icon" strokeWidth={2} />
            )}
            <span className="btn-buy__label">
              {ultraTight ? "₴" : t("buy")}
            </span>
          </button>
          {SIMULATOR_LINK_ENABLED && (
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
          )}
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
