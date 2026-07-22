"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  total,
  limit,
}: {
  page: number;
  total: number;
  limit: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const go = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const items: number[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== -1) items.push(-1);
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        className="btn-secondary p-2 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((i, idx) =>
        i === -1 ? (
          <span key={`e-${idx}`} className="px-2 text-muted-ui">
            …
          </span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            className={cn(
              "min-w-9 rounded-[10px] px-3 py-2 text-sm font-medium transition",
              i === page
                ? "text-white"
                : "text-secondary hover:bg-white/[0.06] hover:text-primary"
            )}
            style={
              i === page
                ? { background: "var(--accent)" }
                : undefined
            }
          >
            {i}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => go(page + 1)}
        className="btn-secondary p-2 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
