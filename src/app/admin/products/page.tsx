"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Brand, Category, Product } from "@/types";
import { formatPrice } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [published, setPublished] = useState("all");
  const [stock, setStock] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const limit = 40;
  const low = 2;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (brandId) params.set("brandId", brandId);
    if (published !== "all") params.set("published", published);
    if (stock !== "all") params.set("stock", stock);
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("lowThreshold", String(low));
    const res = await fetch(`/api/admin/products?${params}`);
    if (res.status === 401) {
      setError("Unauthorized");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setBrands(data.brands || []);
    setCategories(data.categories || []);
    setLoading(false);
  }, [q, categoryId, brandId, published, stock, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };

  const bulk = async (action: string, extra?: Record<string, unknown>) => {
    const ids = Array.from(selected);
    if (!ids.length) {
      setMsg("Оберіть товари");
      return;
    }
    if (action === "delete" && !confirm(`Видалити ${ids.length} товарів?`))
      return;
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Помилка");
      return;
    }
    setMsg(`Оновлено: ${data.affected ?? ids.length}`);
    setSelected(new Set());
    load();
  };

  const inline = async (
    id: string,
    fields: { price?: number; stock?: number }
  ) => {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inline", id, ...fields }),
    });
    load();
  };

  const duplicate = async (id: string) => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", id }),
    });
    const data = await res.json();
    if (res.ok && data.product?.id) {
      window.location.href = `/admin/products/${data.product.id}`;
    } else {
      setMsg(data.error || "Помилка копіювання");
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Товари</h1>
          <p className="text-sm text-zinc-500">
            {total} позицій · пошук, фільтри, масові дії, інлайн-ціна/склад
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Додати товар
        </Link>
      </div>

      {msg && (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          className="min-w-[160px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Назва / SKU…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
        >
          <option value="">Категорія</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameUk}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={brandId}
          onChange={(e) => {
            setPage(1);
            setBrandId(e.target.value);
          }}
        >
          <option value="">Бренд</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={published}
          onChange={(e) => {
            setPage(1);
            setPublished(e.target.value);
          }}
        >
          <option value="all">Публікація</option>
          <option value="yes">Опубліковані</option>
          <option value="no">Чернетки</option>
        </select>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={stock}
          onChange={(e) => {
            setPage(1);
            setStock(e.target.value);
          }}
        >
          <option value="all">Склад</option>
          <option value="in">В наявності</option>
          <option value="low">Мало (≤{low})</option>
          <option value="out">Немає</option>
        </select>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Новіші</option>
          <option value="price_asc">Ціна ↑</option>
          <option value="price_desc">Ціна ↓</option>
          <option value="stock_asc">Склад ↑</option>
          <option value="stock_desc">Склад ↓</option>
          <option value="name">Назва</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load();
          }}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          OK
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
          <span className="font-medium text-sky-900">
            Обрано: {selected.size}
          </span>
          <button
            type="button"
            onClick={() => bulk("publish")}
            className="rounded border border-sky-300 bg-white px-2 py-1 text-xs"
          >
            Опублікувати
          </button>
          <button
            type="button"
            onClick={() => bulk("unpublish")}
            className="rounded border border-sky-300 bg-white px-2 py-1 text-xs"
          >
            Зняти
          </button>
          <button
            type="button"
            onClick={() => {
              const p = prompt("Змінити ціну на % (напр. -10 або 5)", "-5");
              if (p == null) return;
              bulk("pricePercent", { percent: Number(p) });
            }}
            className="rounded border border-sky-300 bg-white px-2 py-1 text-xs"
          >
            Ціна ±%
          </button>
          <button
            type="button"
            onClick={() => bulk("delete")}
            className="rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-600"
          >
            Видалити
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={
                    products.length > 0 && selected.size === products.length
                  }
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-3 font-medium">Товар</th>
              <th className="px-3 py-3 font-medium">Ціна</th>
              <th className="px-3 py-3 font-medium">Склад</th>
              <th className="px-3 py-3 font-medium">Статус</th>
              <th className="px-3 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                  Завантаження…
                </td>
              </tr>
            ) : !products.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                  Товарів не знайдено
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0]}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">{p.nameUk}</p>
                        <p className="text-xs text-zinc-400">
                          {p.sku || p.slug} · {p.brandName || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      className="w-28 rounded border border-zinc-200 px-2 py-1 text-sm tabular-nums"
                      defaultValue={p.price}
                      key={`price-${p.id}-${p.price}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== p.price) {
                          inline(p.id, { price: v });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      className={`w-20 rounded border px-2 py-1 text-sm tabular-nums ${
                        p.stock <= 0
                          ? "border-red-300 bg-red-50 text-red-700"
                          : p.stock <= low
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-zinc-200"
                      }`}
                      defaultValue={p.stock}
                      key={`stock-${p.id}-${p.stock}`}
                      onBlur={(e) => {
                        const v = Math.floor(Number(e.target.value));
                        if (Number.isFinite(v) && v !== p.stock) {
                          inline(p.id, { stock: v });
                        }
                      }}
                    />
                    {p.stock <= 0 ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase text-red-600">
                        немає
                      </span>
                    ) : p.stock <= low ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase text-amber-600">
                        мало
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {p.published ? (
                      <span className="text-emerald-700">Опубл.</span>
                    ) : (
                      <span className="text-zinc-400">Чернетка</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => duplicate(p.id)}
                        className="text-xs font-medium text-zinc-600 hover:underline"
                      >
                        Копія
                      </button>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-xs font-medium text-sky-700 hover:underline"
                      >
                        Редагувати
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-zinc-600">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
