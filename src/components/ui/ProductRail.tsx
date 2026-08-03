import { Link } from "@/i18n/routing";
import type { Product } from "@/types";
import { ProductLayoutGrid } from "./ProductLayoutGrid";
import { ChevronRight } from "lucide-react";

export function ProductRail({
  title,
  products,
  href,
  viewAllLabel,
}: {
  title: string;
  products: Product[];
  href?: string;
  viewAllLabel?: string;
}) {
  if (!products.length) return null;

  return (
    <section className="py-10 sm:py-14">
      <div className="container-shop">
        <div className="mb-2 flex items-end justify-between gap-4 sm:mb-3">
          <h2 className="section-title">{title}</h2>
          {href && viewAllLabel && (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-secondary transition hover:text-[var(--accent)]"
            >
              {viewAllLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Toggle + responsive grid — no side-scroll on mobile */}
        <ProductLayoutGrid
          products={products}
          defaultMode="4col"
          modes={["2col", "3col", "4col", "dense"]}
        />
      </div>
    </section>
  );
}
