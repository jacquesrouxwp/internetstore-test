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
    <section className={cn("border-t border-white/10 py-12", className)}>
      <div className="container-shop">
        {title && <h2 className="section-title mb-6">{title}</h2>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/catalog/teplovizori?brand=${b.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] shadow-card backdrop-blur-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:shadow-lift"
            >
              <div className="flex aspect-[3/2] items-center justify-center bg-white px-4 py-5">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    className="max-h-14 w-auto max-w-full object-contain transition duration-300 group-hover:scale-105 sm:max-h-16"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-display text-lg font-semibold tracking-tight text-zinc-800">
                    {b.name}
                  </span>
                )}
              </div>
              <div className="border-t border-white/10 px-3 py-2.5 text-center">
                <span className="text-xs font-medium text-emerald-400 transition group-hover:text-accent sm:text-sm">
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
