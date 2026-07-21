"use client";

import { useCart } from "@/lib/cart-store";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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
        <p className="text-lg font-medium text-ink">{t("empty")}</p>
        <Link href="/catalog/teplovizori" className="btn-primary mt-6 inline-flex">
          {t("continue")}
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
            <div className="h-20 w-20 shrink-0 rounded-lg bg-canvas" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${item.slug}`}
                className="font-medium text-ink hover:text-accent"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {formatPrice(item.price, locale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-line p-1.5 hover:bg-canvas"
                onClick={() => setQty(item.productId, item.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <button
                type="button"
                className="rounded-md border border-line p-1.5 hover:bg-canvas"
                onClick={() => setQty(item.productId, item.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="w-24 text-right text-sm font-semibold">
              {formatPrice(item.price * item.quantity, locale)}
            </p>
            <button
              type="button"
              className="rounded-md p-2 text-muted hover:bg-accent-soft hover:text-accent"
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
          <span className="text-muted">{t("total")}</span>
          <span className="text-xl font-semibold tracking-tight">
            {formatPrice(total(), locale)}
          </span>
        </div>
        <Link href="/checkout" className="btn-primary mt-6 w-full">
          {t("checkout")}
        </Link>
        <Link
          href="/catalog/teplovizori"
          className="btn-ghost mt-2 w-full text-sm"
        >
          {t("continue")}
        </Link>
      </aside>
    </div>
  );
}
