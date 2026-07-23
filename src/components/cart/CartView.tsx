"use client";

import { useCart } from "@/lib/cart-store";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";

export function CartView() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart((s) => s.total);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="py-20 text-center text-muted">{t("title")}…</div>;
  }

  if (!items.length) {
    return (
      <div className="card-surface mx-auto max-w-lg py-16 text-center">
        <p className="text-lg font-semibold text-primary">{t("empty")}</p>
        <Link href="/catalog/teplovizori" className="btn-buy mt-6 inline-flex w-auto min-w-[200px]">
          <span className="btn-buy__label">{t("continue")}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="card-surface flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
          >
            <div
              className="h-20 w-20 shrink-0 rounded-xl"
              style={{ background: "var(--photo-bg)" }}
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${item.slug}`}
                className="font-semibold text-primary hover:text-[var(--accent)]"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-sm text-secondary">
                {formatPrice(item.price, locale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border p-1.5 text-primary transition hover:bg-white/[0.06]"
                style={{ borderColor: "var(--border-strong)" }}
                onClick={() => setQty(item.productId, item.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-primary">
                {item.quantity}
              </span>
              <button
                type="button"
                className="rounded-full border p-1.5 text-primary transition hover:bg-white/[0.06]"
                style={{ borderColor: "var(--border-strong)" }}
                onClick={() => setQty(item.productId, item.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="w-24 text-right text-sm font-bold text-price">
              {formatPrice(item.price * item.quantity, locale)}
            </p>
            <button
              type="button"
              className="rounded-full p-2 text-muted-ui transition hover:bg-white/[0.06] hover:text-[var(--accent)]"
              onClick={() => remove(item.productId)}
              aria-label={t("remove")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <aside className="card-surface h-fit p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">{t("total")}</span>
          <span className="text-xl font-bold tracking-tight text-price">
            {formatPrice(total(), locale)}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-secondary"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <BrandMark brand="nova-poshta" size="sm" />
          <span>
            {locale === "ru"
              ? "Доставка Новой Почтой по Украине"
              : "Доставка Новою Поштою по Україні"}
          </span>
        </div>
        <Link href="/checkout" className="btn-buy mt-6">
          <span className="btn-buy__label">{t("checkout")}</span>
        </Link>
        <Link href="/catalog/teplovizori" className="btn-buy mt-2">
          <span className="btn-buy__label">{t("continue")}</span>
        </Link>
      </aside>
    </div>
  );
}
