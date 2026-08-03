"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ScanEye, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/types";
import { productName, productShort, salePercent } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { useContext, useState } from "react";
import { PriceCompareBadge } from "@/components/product/PriceCompareBadge";
import { ThermalScoreBadge } from "@/components/product/ThermalScorePanel";
import {
  isThermalProduct,
  scoreProduct,
} from "@/lib/thermal/thermal-score";
import { LayoutModeContext } from "@/components/ui/animated-toggle-layout-container";

/**
 * Desktop-only hover: only devices with real hover + fine pointer
 * (mouse/trackpad). Touch phones/tablets skip the "clean photo" effect —
 * a tap simply opens the product page.
 */
const hoverDesk = "[@media(hover:hover)_and_(pointer:fine)]";

// Feature flag: thermal simulator disabled site-wide (kept in code, not
// removed, per owner request 2026-08-01) -- hides the dead #thermal-simulator
// deep link that would otherwise sit on every product card.
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
  const short = productShort(product, locale);
  const thermalScore = isThermalProduct(product)
    ? scoreProduct(product).scores.thermalPerformance
    : null;
  const layoutMode = useContext(LayoutModeContext);
  /** 3-up (and denser) → smaller image padding / type so cards fit on phone */
  const tight =
    layoutMode === "3col" ||
    layoutMode === "4col" ||
    layoutMode === "dense";
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
        tight && "product-card--tight"
      )}
      data-layout={layoutMode}
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
                "h-full w-full object-contain transition-all duration-500 ease-premium",
                tight ? "p-1.5 sm:p-2.5" : "p-4",
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
          "relative z-10 flex flex-1 flex-col transition-opacity duration-300 ease-premium",
          tight ? "px-1.5 pt-1.5 sm:px-3 sm:pt-3" : "px-3.5 pt-3.5 sm:px-4 sm:pt-4",
          `${hoverDesk}:group-hover:pointer-events-none`,
          `${hoverDesk}:group-hover:opacity-0`
        )}
      >
        {product.brandName ? (
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
              tight
                ? "min-h-0 text-[11px] sm:min-h-[2.5rem] sm:text-sm"
                : "min-h-[2.5rem] text-sm"
            )}
          >
            {name}
          </h3>
        </Link>
        {short && !compact && !tight && (
          <p className="mt-1 line-clamp-2 text-xs leading-normal text-secondary">
            {short}
          </p>
        )}

        <div
          className={cn(
            "mt-1.5 flex flex-wrap items-center gap-1.5 text-secondary",
            tight ? "text-[10px] sm:text-xs" : "mt-2 gap-2 text-xs"
          )}
        >
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
          {thermalScore != null && !tight && (
            <ThermalScoreBadge score={thermalScore} />
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative z-30 mt-auto rounded-b-[calc(var(--radius-card)-1px)] bg-[var(--surface)]",
          tight
            ? "px-1.5 pb-1.5 pt-1.5 sm:px-3 sm:pb-3 sm:pt-2"
            : "px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4"
        )}
      >
        <div className={cn("mb-1.5 flex flex-wrap items-baseline gap-1", !tight && "mb-2 gap-2")}>
          <span
            className={cn(
              "tracking-tight text-price",
              tight ? "text-sm sm:text-lg" : "text-lg"
            )}
          >
            {formatPrice(product.price, locale)}
          </span>
          {product.oldPrice != null && product.oldPrice > product.price && (
            <span className={cn("text-price-old", tight ? "text-[10px]" : "text-sm")}>
              {formatPrice(product.oldPrice, locale)}
            </span>
          )}
        </div>
        {product.priceCompare && !tight && (
          <div className="mb-3">
            <PriceCompareBadge compare={product.priceCompare} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className={cn("btn-buy w-full", tight && "btn-buy--compact text-[11px]")}
          >
            <ShoppingCart className="btn-buy__icon" strokeWidth={2} />
            <span className="btn-buy__label">{t("buy")}</span>
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
