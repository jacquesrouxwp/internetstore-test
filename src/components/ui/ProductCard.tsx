"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/types";
import { productName, productShort, salePercent } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { useState } from "react";

/**
 * Desktop-only hover: only devices with real hover + fine pointer
 * (mouse/trackpad). Touch phones/tablets skip the "clean photo" effect —
 * a tap simply opens the product page.
 */
const hoverDesk =
  "[@media(hover:hover)_and_(pointer:fine)]";

function ProductPlaceholder({ brand }: { brand?: string | null }) {
  const label = brand || "X";
  let hue = 0;
  for (let i = 0; i < label.length; i++) hue += label.charCodeAt(i);
  hue = hue % 360;
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `linear-gradient(145deg, hsl(${hue}, 12%, 94%), hsl(${hue}, 8%, 88%))`,
      }}
    >
      <div
        className="h-16 w-20 rounded-2xl border-2 border-white/80 shadow-sm sm:h-20 sm:w-24"
        style={{
          background: `linear-gradient(145deg, hsl(${hue}, 18%, 42%), hsl(${hue}, 22%, 28%))`,
        }}
      >
        <div className="mx-auto mt-5 h-8 w-8 rounded-full border-2 border-white/70 sm:mt-6 sm:h-9 sm:w-9" />
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
        "group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] shadow-card backdrop-blur-sm",
        "transition-all duration-300 ease-premium",
        // lift only on desktop hover
        `${hoverDesk}:hover:-translate-y-1 ${hoverDesk}:hover:z-20 ${hoverDesk}:hover:shadow-lift`,
        // mobile: light press feedback without hiding content
        "active:scale-[0.99]",
        compact && "min-w-[220px] max-w-[260px]"
      )}
    >
      {/* Photo — desktop hover expands full card; mobile = normal + tap opens product */}
      <Link
        href={`/product/${product.slug}`}
        className={cn(
          "relative z-10 block aspect-square overflow-hidden bg-white",
          `${hoverDesk}:group-hover:absolute ${hoverDesk}:group-hover:inset-0`,
          `${hoverDesk}:group-hover:z-20 ${hoverDesk}:group-hover:aspect-auto ${hoverDesk}:group-hover:h-full`
        )}
        aria-label={name}
      >
        <div className="relative h-full w-full bg-white">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={name}
              className={cn(
                "h-full w-full object-contain p-4 transition-all duration-500 ease-premium",
                `${hoverDesk}:group-hover:p-8 ${hoverDesk}:group-hover:scale-[1.03]`
              )}
            />
          ) : (
            <div
              className={cn(
                "h-full transition-transform duration-500 ease-premium",
                `${hoverDesk}:group-hover:scale-[1.03]`
              )}
            >
              <ProductPlaceholder brand={product.brandName} />
            </div>
          )}

          {/* Badges — hide only on desktop hover */}
          <div
            className={cn(
              "absolute left-2 top-2 z-[1] flex flex-col gap-1",
              "transition-all duration-250 ease-premium",
              `${hoverDesk}:group-hover:pointer-events-none`,
              `${hoverDesk}:group-hover:-translate-y-1`,
              `${hoverDesk}:group-hover:opacity-0`
            )}
          >
            {sale != null && (
              <span className="label-badge bg-accent text-white">-{sale}%</span>
            )}
            {product.isHit && (
              <span className="label-badge bg-zinc-900 text-white">{t("hit")}</span>
            )}
            {product.isNew && (
              <span className="label-badge bg-success text-white">{t("new")}</span>
            )}
            {product.isTop && !product.isHit && (
              <span className="label-badge bg-zinc-700 text-white">{t("top")}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Info always visible on mobile; fades only on desktop hover */}
      <div
        className={cn(
          "relative z-0 flex flex-1 flex-col p-3.5 sm:p-4",
          "transition-opacity duration-300 ease-premium",
          `${hoverDesk}:group-hover:pointer-events-none`,
          `${hoverDesk}:group-hover:opacity-0`
        )}
      >
        {product.brandName && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {product.brandName}
          </p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-white">
            {name}
          </h3>
        </Link>
        {short && !compact && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{short}</p>
        )}

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-white">{product.rating.toFixed(1)}</span>
          <span>
            ({product.reviewsCount} {t("reviews")})
          </span>
        </div>

        <div className="mt-auto pt-3">
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-white">
              {formatPrice(product.price, locale)}
            </span>
            {product.oldPrice != null && product.oldPrice > product.price && (
              <span className="text-sm text-slate-500 line-through">
                {formatPrice(product.oldPrice, locale)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="btn-primary w-full text-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            {t("buy")}
          </button>
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          ✓
        </div>
      )}
    </article>
  );
}
