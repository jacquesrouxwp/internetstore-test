"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function CatalogToolbar({ total }: { total: number }) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || "default";
  const limit = searchParams.get("limit") || "12";

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value === "default" && key === "sort") p.delete("sort");
    else p.set(key, value);
    if (key !== "page") p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-secondary">
        {t("found", { count: total })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-secondary">
          <span>{t("sort")}</span>
          <select
            className="input w-auto py-1.5"
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="default">{t("sortDefault")}</option>
            <option value="price_asc">{t("sortPriceAsc")}</option>
            <option value="price_desc">{t("sortPriceDesc")}</option>
            <option value="name_asc">{t("sortNameAsc")}</option>
            <option value="name_desc">{t("sortNameDesc")}</option>
            <option value="rating">{t("sortRating")}</option>
            <option value="newest">{t("sortNewest")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <span>{t("show")}</span>
          <select
            className="input w-auto py-1.5"
            value={limit}
            onChange={(e) => update("limit", e.target.value)}
          >
            {[12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
