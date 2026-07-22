"use client";

import { useMemo, useState } from "react";
import type { Brand, Category, Product } from "@/types";
import { DEVICE_TYPES, SPEC_FIELDS } from "@/lib/admin/constants";
import { cn } from "@/lib/utils";

export type ProductFormState = {
  nameUk: string;
  nameRu: string;
  descriptionUk: string;
  descriptionRu: string;
  shortUk: string;
  shortRu: string;
  price: string;
  oldPrice: string;
  stock: string;
  sku: string;
  brandId: string;
  categoryId: string;
  resolution: string;
  deviceType: string;
  detectionRangeM: string;
  isHit: boolean;
  isNew: boolean;
  isTop: boolean;
  isSale: boolean;
  published: boolean;
  images: string[];
  specs: Record<string, string>;
};

export function productToForm(p?: Product | null): ProductFormState {
  return {
    nameUk: p?.nameUk || "",
    nameRu: p?.nameRu || "",
    descriptionUk: p?.descriptionUk || "",
    descriptionRu: p?.descriptionRu || "",
    shortUk: p?.shortUk || "",
    shortRu: p?.shortRu || "",
    price: p?.price != null ? String(p.price) : "",
    oldPrice: p?.oldPrice != null ? String(p.oldPrice) : "",
    stock: p?.stock != null ? String(p.stock) : "0",
    sku: p?.sku || "",
    brandId: p?.brandId || "",
    categoryId: p?.categoryId || "",
    resolution: p?.resolution || "",
    deviceType: p?.deviceType || "mono",
    detectionRangeM:
      p?.detectionRangeM != null ? String(p.detectionRangeM) : "",
    isHit: Boolean(p?.isHit),
    isNew: Boolean(p?.isNew),
    isTop: Boolean(p?.isTop),
    isSale: Boolean(p?.isSale),
    published: p?.published !== false,
    images: p?.images ? [...p.images] : [],
    specs: { ...(p?.specs || {}) },
  };
}

export function formToPayload(form: ProductFormState, id?: string) {
  const specs = { ...form.specs };
  if (form.detectionRangeM) {
    specs["Дальність виявлення людини, м"] = form.detectionRangeM;
  }
  if (form.resolution) {
    specs["Матриця"] = form.resolution;
  }

  return {
    id,
    nameUk: form.nameUk,
    nameRu: form.nameRu || form.nameUk,
    descriptionUk: form.descriptionUk,
    descriptionRu: form.descriptionRu || form.descriptionUk,
    shortUk: form.shortUk,
    shortRu: form.shortRu || form.shortUk,
    price: Number(form.price) || 0,
    oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
    stock: Number(form.stock) || 0,
    sku: form.sku || null,
    brandId: form.brandId || null,
    categoryId: form.categoryId || null,
    resolution: form.resolution || null,
    deviceType: form.deviceType || "mono",
    detectionRangeM: form.detectionRangeM
      ? Number(form.detectionRangeM)
      : null,
    isHit: form.isHit,
    isNew: form.isNew,
    isTop: form.isTop,
    isSale: form.isSale || Boolean(form.oldPrice && Number(form.oldPrice) > Number(form.price)),
    published: form.published,
    images: form.images,
    mainImageIndex: 0,
    specs,
  };
}

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";
const label = "mb-1 block text-xs font-medium text-zinc-600";

type Props = {
  initial?: Product | null;
  brands: Brand[];
  categories: Category[];
  onSubmit: (payload: ReturnType<typeof formToPayload>) => Promise<void>;
  submitLabel?: string;
};

export function ProductForm({
  initial,
  brands,
  categories,
  onSubmit,
  submitLabel = "Зберегти",
}: Props) {
  const [form, setForm] = useState<ProductFormState>(() =>
    productToForm(initial)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extraSpecKey, setExtraSpecKey] = useState("");
  const [extraSpecVal, setExtraSpecVal] = useState("");

  const set = <K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const sortedCats = useMemo(
    () =>
      [...categories].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [categories]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("productKey", initial?.id || "new");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка завантаження");
      if (data.urls?.length) {
        setForm((f) => ({ ...f, images: [...f.images, ...data.urls] }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження фото");
    } finally {
      setUploading(false);
    }
  };

  const addImageUrl = () => {
    const url = prompt("URL зображення:");
    if (url?.trim()) {
      setForm((f) => ({ ...f, images: [...f.images, url.trim()] }));
    }
  };

  const setMain = (index: number) => {
    setForm((f) => {
      const images = [...f.images];
      const [main] = images.splice(index, 1);
      images.unshift(main);
      return { ...f, images };
    });
  };

  const removeImage = (index: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(formToPayload(form, initial?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Names */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Назва та опис
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className={label}>Назва (УКР) *</span>
            <input
              className={field}
              value={form.nameUk}
              onChange={(e) => set("nameUk", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className={label}>Назва (РУС)</span>
            <input
              className={field}
              value={form.nameRu}
              onChange={(e) => set("nameRu", e.target.value)}
              placeholder="Якщо порожньо — скопіюється з УКР"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Короткий опис (УКР)</span>
            <input
              className={field}
              value={form.shortUk}
              onChange={(e) => set("shortUk", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Короткий опис (РУС)</span>
            <input
              className={field}
              value={form.shortRu}
              onChange={(e) => set("shortRu", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Опис (УКР)</span>
            <textarea
              className={cn(field, "min-h-[100px]")}
              value={form.descriptionUk}
              onChange={(e) => set("descriptionUk", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Опис (РУС)</span>
            <textarea
              className={cn(field, "min-h-[100px]")}
              value={form.descriptionRu}
              onChange={(e) => set("descriptionRu", e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Price & stock */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Ціна та наявність
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={label}>Ціна, грн *</span>
            <input
              className={field}
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className={label}>Стара ціна, грн</span>
            <input
              className={field}
              type="number"
              min={0}
              value={form.oldPrice}
              onChange={(e) => set("oldPrice", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Наявність (шт)</span>
            <input
              className={field}
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Артикул (SKU)</span>
            <input
              className={field}
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Category / brand */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Категорія та бренд
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={label}>Категорія</span>
            <select
              className={field}
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              <option value="">— оберіть —</option>
              {sortedCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameUk}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Бренд</span>
            <select
              className={field}
              value={form.brandId}
              onChange={(e) => set("brandId", e.target.value)}
            >
              <option value="">— оберіть —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Тип пристрою</span>
            <select
              className={field}
              value={form.deviceType}
              onChange={(e) => set("deviceType", e.target.value)}
            >
              {DEVICE_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Матриця</span>
            <input
              className={field}
              value={form.resolution}
              onChange={(e) => set("resolution", e.target.value)}
              placeholder="384x288"
            />
          </label>
          <label className="block">
            <span className={label}>Дальність виявлення, м</span>
            <input
              className={field}
              type="number"
              min={0}
              value={form.detectionRangeM}
              onChange={(e) => set("detectionRangeM", e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Specs */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Характеристики
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SPEC_FIELDS.map((sf) => (
            <label key={sf.key} className="block">
              <span className={label}>{sf.key}</span>
              <input
                className={field}
                placeholder={sf.placeholder}
                value={form.specs[sf.key] || ""}
                onChange={(e) =>
                  set("specs", { ...form.specs, [sf.key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4">
          <label className="block min-w-[140px] flex-1">
            <span className={label}>Додаткове поле</span>
            <input
              className={field}
              placeholder="Назва"
              value={extraSpecKey}
              onChange={(e) => setExtraSpecKey(e.target.value)}
            />
          </label>
          <label className="block min-w-[140px] flex-1">
            <span className={label}>Значення</span>
            <input
              className={field}
              placeholder="Значення"
              value={extraSpecVal}
              onChange={(e) => setExtraSpecVal(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
            onClick={() => {
              if (!extraSpecKey.trim()) return;
              set("specs", {
                ...form.specs,
                [extraSpecKey.trim()]: extraSpecVal,
              });
              setExtraSpecKey("");
              setExtraSpecVal("");
            }}
          >
            Додати
          </button>
        </div>
        {Object.keys(form.specs).filter(
          (k) => !SPEC_FIELDS.some((sf) => sf.key === k)
        ).length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-zinc-600">
            {Object.entries(form.specs)
              .filter(([k]) => !SPEC_FIELDS.some((sf) => sf.key === k))
              .map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-2">
                  <span>
                    <strong>{k}:</strong> {v}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => {
                      const next = { ...form.specs };
                      delete next[k];
                      set("specs", next);
                    }}
                  >
                    видалити
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Photos */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Фотографії
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          Перше фото — головне (відображається в каталозі). Можна завантажити
          кілька файлів або додати URL.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            {uploading ? "Завантаження…" : "Завантажити фото"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            onClick={addImageUrl}
          >
            Додати URL
          </button>
        </div>
        {form.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {form.images.map((src, i) => (
              <div
                key={`${src.slice(0, 40)}-${i}`}
                className={cn(
                  "relative overflow-hidden rounded-lg border-2 bg-zinc-50",
                  i === 0 ? "border-emerald-500" : "border-zinc-200"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="aspect-square w-full object-contain p-1"
                />
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1">
                  {i !== 0 && (
                    <button
                      type="button"
                      className="flex-1 rounded bg-white/90 px-1 py-0.5 text-[10px] font-medium"
                      onClick={() => setMain(i)}
                    >
                      Головне
                    </button>
                  )}
                  {i === 0 && (
                    <span className="flex-1 text-center text-[10px] font-medium text-emerald-300">
                      Головне
                    </span>
                  )}
                  <button
                    type="button"
                    className="rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] text-white"
                    onClick={() => removeImage(i)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-400">
            Фото ще немає
          </p>
        )}
      </section>

      {/* Flags */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Мітки (бейджі на сайті)
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["isHit", "Хит"],
              ["isNew", "Новинка"],
              ["isTop", "Топ продаж"],
              ["isSale", "Скидка"],
              ["published", "Опубліковано"],
            ] as const
          ).map(([key, labelText]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              {labelText}
            </label>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "Збереження…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
