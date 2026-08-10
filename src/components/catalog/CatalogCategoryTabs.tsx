import { Link } from "@/i18n/routing";
import type { Category } from "@/types";
import { categoryName } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Horizontal category switcher — scroll if chips don't fit (mobile + desktop).
 */
export function CatalogCategoryTabs({
  categories,
  currentSlug,
  locale,
}: {
  categories: Category[];
  currentSlug: string;
  locale: "uk" | "ru";
}) {
  if (!categories.length) return null;

  return (
    <div className="catalog-cat-tabs relative mb-4 sm:mb-5">
      <div
        className="flex gap-2 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Categories"
      >
        {categories.map((c) => {
          const active = c.slug === currentSlug;
          const label = categoryName(c, locale);
          return (
            <Link
              key={c.id}
              href={`/catalog/${c.slug}`}
              role="tab"
              aria-selected={active}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-semibold tracking-wide transition sm:px-4 sm:text-sm",
                "whitespace-nowrap touch-manipulation",
                active
                  ? "border-[var(--accent)] bg-[rgba(225,29,42,0.16)] text-primary shadow-[0_0_0_1px_rgba(225,29,42,0.25)]"
                  : "border-white/10 bg-white/[0.04] text-secondary hover:border-white/20 hover:bg-white/[0.07] hover:text-primary"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
      {/* Soft fade on the right when list scrolls */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12"
        style={{
          background:
            "linear-gradient(to left, var(--background, #05060f), transparent)",
        }}
        aria-hidden
      />
    </div>
  );
}
