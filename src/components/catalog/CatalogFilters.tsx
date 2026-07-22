"use client";

import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Brand } from "@/types";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";

const RESOLUTIONS = [
  { value: "256", label: "256×192" },
  { value: "384", label: "384×288" },
  { value: "640", label: "640×512" },
];

export function CatalogFilters({
  brands,
  detectionRangeBounds,
}: {
  brands: Brand[];
  /** When set, shows detection-range dual slider for this category */
  detectionRangeBounds?: { min: number; max: number } | null;
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedBrands = searchParams.getAll("brand");
  const selectedRes = searchParams.getAll("res");
  const deviceType = searchParams.get("type") || "all";
  const [priceMin, setPriceMin] = useState(searchParams.get("min") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("max") || "");

  const bounds = detectionRangeBounds ?? null;
  const urlRangeMin = searchParams.get("rmin");
  const urlRangeMax = searchParams.get("rmax");
  const rangeMin =
    urlRangeMin != null && urlRangeMin !== ""
      ? Number(urlRangeMin)
      : bounds?.min ?? 0;
  const rangeMax =
    urlRangeMax != null && urlRangeMax !== ""
      ? Number(urlRangeMax)
      : bounds?.max ?? 0;

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      p.delete("page");
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const toggleMulti = (key: string, value: string, current: string[]) => {
    pushParams((p) => {
      p.delete(key);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      next.forEach((v) => p.append(key, v));
    });
  };

  return (
    <aside className="space-y-4">
      <div className="card-surface p-4">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
          {t("filters")}
        </h3>

        <details open className="group py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <summary className="cursor-pointer list-none text-sm font-medium text-primary marker:content-none">
            {t("brand")}
          </summary>
          <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
            {brands.map((b) => {
              const active = selectedBrands.includes(b.slug);
              return (
                <label
                  key={b.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition",
                    active
                      ? "bg-white/[0.06] text-primary"
                      : "text-secondary hover:bg-white/[0.04]"
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded border-[var(--border-strong)] accent-[var(--accent)]"
                    checked={active}
                    onChange={() => toggleMulti("brand", b.slug, selectedBrands)}
                  />
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logoUrl}
                      alt=""
                      className="h-5 w-10 rounded bg-[var(--photo-bg)] object-contain p-0.5"
                    />
                  ) : null}
                  <span className="truncate">{b.name}</span>
                </label>
              );
            })}
          </div>
        </details>

        <details open className="group py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <summary className="cursor-pointer list-none text-sm font-medium text-primary">
            {t("deviceType")}
          </summary>
          <div className="mt-3 space-y-2">
            {[
              ["all", t("allTypes")],
              ["mono", t("mono")],
              ["scope", t("scope")],
            ].map(([val, label]) => (
              <label
                key={val}
                className={cn(
                  "flex cursor-pointer items-center gap-2 text-sm",
                  deviceType === val ? "text-primary font-medium" : "text-secondary"
                )}
              >
                <input
                  type="radio"
                  name="type"
                  className="accent-[var(--accent)]"
                  checked={deviceType === val}
                  onChange={() =>
                    pushParams((p) => {
                      if (val === "all") p.delete("type");
                      else p.set("type", val);
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </details>

        <details open className="group py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <summary className="cursor-pointer list-none text-sm font-medium text-primary">
            {t("resolution")}
          </summary>
          <div className="mt-3 space-y-2">
            {RESOLUTIONS.map((r) => {
              const active = selectedRes.includes(r.value);
              return (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-sm",
                    active ? "text-primary font-medium" : "text-secondary"
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded accent-[var(--accent)]"
                    checked={active}
                    onChange={() => toggleMulti("res", r.value, selectedRes)}
                  />
                  {r.label}
                </label>
              );
            })}
          </div>
        </details>

        <details open className="group py-3" style={{ borderBottom: bounds ? "1px solid var(--border)" : undefined }}>
          <summary className="cursor-pointer list-none text-sm font-medium text-primary">
            {t("price")}
          </summary>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              placeholder={t("from")}
              className="input"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
            <span className="text-muted-ui">—</span>
            <input
              type="number"
              placeholder={t("to")}
              className="input"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary shrink-0 px-3"
              onClick={() =>
                pushParams((p) => {
                  if (priceMin) p.set("min", priceMin);
                  else p.delete("min");
                  if (priceMax) p.set("max", priceMax);
                  else p.delete("max");
                })
              }
            >
              {t("apply")}
            </button>
          </div>
        </details>

        {bounds && (
          <details open className="group py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-primary">
              {t("detectionRange")}
            </summary>
            <div className="mt-3">
              <DualRangeSlider
                min={bounds.min}
                max={bounds.max}
                valueMin={
                  Number.isFinite(rangeMin) ? rangeMin : bounds.min
                }
                valueMax={
                  Number.isFinite(rangeMax) ? rangeMax : bounds.max
                }
                step={10}
                unit="м"
                onChange={(lo, hi) => {
                  pushParams((p) => {
                    // only set params when not at full category span
                    if (lo <= bounds.min && hi >= bounds.max) {
                      p.delete("rmin");
                      p.delete("rmax");
                    } else {
                      p.set("rmin", String(lo));
                      p.set("rmax", String(hi));
                    }
                  });
                }}
              />
            </div>
          </details>
        )}

        <button
          type="button"
          className="btn-secondary mt-2 w-full"
          onClick={() => router.push(pathname)}
        >
          {t("reset")}
        </button>
      </div>

      <div className="card-surface p-5">
        <p className="text-sm font-semibold text-primary">Безкоштовна консультація</p>
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          Підберемо тепловізор під ваші завдання
        </p>
        <a href="tel:+380501112233" className="btn-secondary mt-4 w-full text-sm">
          Подзвонити
        </a>
      </div>
    </aside>
  );
}
