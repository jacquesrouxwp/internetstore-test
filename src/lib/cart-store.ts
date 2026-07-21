"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";
import { productName, type Locale } from "@/types";

interface CartState {
  items: CartItem[];
  add: (product: Product, locale: Locale, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product, locale, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              ),
            };
          }
          const item: CartItem = {
            productId: product.id,
            slug: product.slug,
            name: productName(product, locale),
            price: product.price,
            image: product.images[0],
            quantity: qty,
          };
          return { items: [...state.items, item] };
        });
      },
      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      setQty: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),
      clear: () => set({ items: [] }),
      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "optics_cart_v1" }
  )
);
