"use client";

/**
 * Product grid with animated density toggle (home rails + catalog).
 * No horizontal swipe-scroll — CSS grid wraps on all breakpoints.
 */

import { useLocale } from "next-intl";
import type { Product } from "@/types";
import { ProductCard } from "@/components/ui/ProductCard";
import {
  ContainerToggle,
  CellToggle,
  type LayoutMode,
} from "@/components/ui/animated-toggle-layout-container";
import { cn } from "@/lib/utils";

type Props = {
  products: Product[];
  /** Home rails default denser; catalog can pass "3col" */
  defaultMode?: LayoutMode;
  className?: string;
  /** Subset of modes (home can hide "list" if desired) */
  modes?: LayoutMode[];
  /** Force compact cards */
  forceCompact?: boolean;
};

export function ProductLayoutGrid({
  products,
  defaultMode = "4col",
  className,
  modes,
  forceCompact,
}: Props) {
  const locale = useLocale();

  if (!products.length) return null;

  return (
    <ContainerToggle
      className={cn(className)}
      defaultMode={defaultMode}
      locale={locale}
      modes={modes}
    >
      {products.map((p) => (
        <CellToggle key={p.id}>
          {/* compact cards work better in multi-col; list uses full card */}
          <ProductCard
            product={p}
            compact={forceCompact ?? true}
          />
        </CellToggle>
      ))}
    </ContainerToggle>
  );
}
