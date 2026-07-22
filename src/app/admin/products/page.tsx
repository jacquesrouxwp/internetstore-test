"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/products?${params}`);
    if (res.status === 401) {
      setError("Unauthorized");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Видалити товар «${name}»?`)) return;
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
    load(q);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Товари</h1>
          <p className="text-sm text-zinc-500">
            {products.length} позицій · додавання, редагування, видалення
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Додати товар
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          placeholder="Пошук за назвою, брендом, SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
        />
        <button
          type="button"
          onClick={() => load(q)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Знайти
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Товар</th>
              <th className="px-4 py-3 font-medium">Бренд</th>
              <th className="px-4 py-3 font-medium">Категорія</th>
              <th className="px-4 py-3 font-medium">Ціна</th>
              <th className="px-4 py-3 font-medium">Склад</th>
              <th className="px-4 py-3 font-medium">Мітки</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                  Завантаження…
                </td>
              </tr>
            ) : !products.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                  Товарів не знайдено
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80"
                >
                  <td className="px-4 py-3">
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
                        <p className="text-xs text-zinc-400">{p.sku || p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {p.brandName || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {p.categorySlug || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium tabular-nums">
                      {formatPrice(p.price)}
                    </span>
                    {p.oldPrice ? (
                      <span className="ml-1 text-xs text-zinc-400 line-through">
                        {formatPrice(p.oldPrice)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.stock <= 0
                          ? "text-red-600"
                          : p.stock <= 2
                            ? "text-amber-600"
                            : "text-zinc-700"
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.isHit && <Badge>Хит</Badge>}
                      {p.isNew && <Badge>Новинка</Badge>}
                      {p.isTop && <Badge>Топ</Badge>}
                      {p.isSale && <Badge tone="sale">Скидка</Badge>}
                      {!p.published && <Badge tone="muted">Приховано</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="mr-3 text-sm font-medium text-sky-700 hover:underline"
                    >
                      Редагувати
                    </Link>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => remove(p.id, p.nameUk)}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "sale" | "muted";
}) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        tone === "sale"
          ? "bg-red-100 text-red-700"
          : tone === "muted"
            ? "bg-zinc-100 text-zinc-500"
            : "bg-zinc-900 text-white"
      }`}
    >
      {children}
    </span>
  );
}
