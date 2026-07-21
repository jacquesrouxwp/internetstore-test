"use client";

import { Link } from "@/i18n/routing";
import type { Brand } from "@/types";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export function BrandGrid({
  brands,
  title,
  className,
}: {
  brands: Brand[];
  title?: string;
  className?: string;
}) {
  const locale = useLocale();
  const labelPrefix = locale === "ru" ? "Тепловизоры" : "Тепловізори";

  return (
    <section className={cn("border-t border-line bg-white py-12", className)}>
      <div className="container-shop">
        {title && <h2 className="section-title mb-6">{title}</h2>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/catalog/teplovizori?brand=${b.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-lift"
            >
              <div className="flex aspect-[3/2] items-center justify-center bg-[#fafafa] px-4 py-5">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    className="max-h-14 w-auto max-w-full object-contain transition duration-300 group-hover:scale-105 sm:max-h-16"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-display text-lg font-semibold tracking-tight text-ink">
                    {b.name}
                  </span>
                )}
              </div>
              <div className="border-t border-line px-3 py-2.5 text-center">
                <span className="text-xs font-medium text-emerald-700 transition group-hover:text-accent sm:text-sm">
                  {labelPrefix} {b.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
