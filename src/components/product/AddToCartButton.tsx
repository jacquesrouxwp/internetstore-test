"use client";

import { useCart } from "@/lib/cart-store";
import type { Product } from "@/types";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

export function AddToCartButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const t = useTranslations("product");
  const locale = useLocale() as "uk" | "ru";
  const add = useCart((s) => s.add);
  const [ok, setOk] = useState(false);

  return (
    <button
      type="button"
      disabled={product.stock <= 0}
      className={className || "btn-primary"}
      onClick={() => {
        add(product, locale);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      <ShoppingCart className="h-4 w-4" />
      {ok ? "✓" : t("addToCart")}
    </button>
  );
}
