"use client";

import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Brand } from "@/types";
import { useCallback, useState } from "react";

const RESOLUTIONS = [
  { value: "256", label: "256×192" },
  { value: "384", label: "384×288" },
  { value: "640", label: "640×512" },
];

export function CatalogFilters({ brands }: { brands: Brand[] }) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedBrands = searchParams.getAll("brand");
  const selectedRes = searchParams.getAll("res");
  const deviceType = searchParams.get("type") || "all";
  const [priceMin, setPriceMin] = useState(searchParams.get("min") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("max") || "");

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
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink">
          {t("filters")}
        </h3>

        <details open className="group border-b border-line py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:content-none">
            {t("brand")}
          </summary>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  className="rounded border-line text-accent focus:ring-accent/30"
                  checked={selectedBrands.includes(b.slug)}
                  onChange={() => toggleMulti("brand", b.slug, selectedBrands)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </details>

        <details open className="group border-b border-line py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink">
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
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="radio"
                  name="type"
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

        <details open className="group border-b border-line py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink">
            {t("resolution")}
          </summary>
          <div className="mt-3 space-y-2">
            {RESOLUTIONS.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  className="rounded border-line"
                  checked={selectedRes.includes(r.value)}
                  onChange={() => toggleMulti("res", r.value, selectedRes)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </details>

        <details open className="group py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink">
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
            <span className="text-muted">—</span>
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

        <button
          type="button"
          className="btn-ghost mt-2 w-full border border-line"
          onClick={() => router.push(pathname)}
        >
          {t("reset")}
        </button>
      </div>

      <div className="card-surface bg-ink p-5 text-white">
        <p className="text-sm font-semibold">Безкоштовна консультація</p>
        <p className="mt-1 text-xs text-zinc-400">
          Підберемо тепловізор під ваші завдання
        </p>
        <a href="tel:+380501112233" className="btn-primary mt-4 w-full text-sm">
          Подзвонити
        </a>
      </div>
    </aside>
  );
}
