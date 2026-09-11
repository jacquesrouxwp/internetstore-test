/**
 * Catalog pagination as real links.
 *
 * It used to be `<button onClick={() => router.push(...)}>` inside
 * `<Suspense fallback={null}>` with `useSearchParams()`. Two problems for
 * search engines: crawlers follow `<a href>`, never click buttons; and the
 * Suspense fallback meant the control was not in the server HTML at all.
 * Googlebot therefore saw 12 products per category and no way to page 2, so
 * ~1,150 products had no internal link anywhere and sat in Search Console as
 * "Discovered – currently not indexed".
 *
 * Now a server component: hrefs are computed from props, so every page link
 * ships in the HTML, carries the active filters, and still navigates
 * client-side via next-intl's Link.
 */

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { paginationHref, paginationItems } from "@/lib/pagination";

type Query = Record<string, string | string[] | undefined>;

export function Pagination({
  page,
  total,
  limit,
  basePath,
  query = {},
}: {
  page: number;
  total: number;
  limit: number;
  /** Locale-agnostic path, e.g. "/catalog/teplovizori" or "/search". */
  basePath: string;
  /** Current search params — filters are preserved, `page` is rewritten. */
  query?: Query;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const href = (p: number) => paginationHref(basePath, query, p);
  const arrow = "btn-secondary p-2";

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={arrow} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-40")} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {paginationItems(page, pages).map((i, idx) =>
        i === -1 ? (
          <span key={`e-${idx}`} className="px-2 text-muted-ui">
            …
          </span>
        ) : (
          <Link
            key={i}
            href={href(i)}
            aria-current={i === page ? "page" : undefined}
            className={cn(
              "min-w-9 rounded-[10px] px-3 py-2 text-center text-sm font-medium transition",
              i === page
                ? "text-white"
                : "text-secondary hover:bg-white/[0.06] hover:text-primary"
            )}
            style={i === page ? { background: "var(--accent)" } : undefined}
          >
            {i}
          </Link>
        )
      )}

      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={arrow} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-40")} aria-disabled="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
