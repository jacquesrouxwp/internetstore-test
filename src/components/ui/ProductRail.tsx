import { Link } from "@/i18n/routing";
import type { Product } from "@/types";
import { ProductCard } from "./ProductCard";
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
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="section-title">{title}</h2>
          {href && viewAllLabel && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition hover:text-accent"
            >
              {viewAllLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>
      </div>
    </section>
  );
}
