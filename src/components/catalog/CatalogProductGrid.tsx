"use client";

import type { Product } from "@/types";
import { ProductLayoutGrid } from "@/components/ui/ProductLayoutGrid";

/** Catalog product list with density toggle (2 / 3 / 4 / dense). */
export function CatalogProductGrid({ products }: { products: Product[] }) {
  return (
    <ProductLayoutGrid
      products={products}
      defaultMode="4col"
      modes={["4col", "6col"]}
      forceCompact={false}
    />
  );
}
