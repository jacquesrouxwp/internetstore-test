"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nameUk: "",
    price: "",
    oldPrice: "",
    stock: "5",
    brandName: "",
    detectionRangeM: "",
    categorySlug: "teplovizori",
    isHit: false,
    isNew: false,
    isTop: false,
  });

  const load = async () => {
    const res = await fetch("/api/admin/products");
    if (res.status === 401) {
      setError("Unauthorized — login first");
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameUk: form.nameUk,
        nameRu: form.nameUk,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        stock: Number(form.stock),
        brandName: form.brandName,
        brandSlug: form.brandName.toLowerCase(),
        detectionRangeM: form.detectionRangeM
          ? Number(form.detectionRangeM)
          : null,
        isHit: form.isHit,
        isNew: form.isNew,
        isTop: form.isTop,
        isSale: Boolean(form.oldPrice),
        categorySlug: form.categorySlug || "teplovizori",
      }),
    });
    if (!res.ok) {
      setError("Save failed");
      return;
    }
    setForm({
      nameUk: "",
      price: "",
      oldPrice: "",
      stock: "5",
      brandName: "",
      detectionRangeM: "",
      categorySlug: "teplovizori",
      isHit: false,
      isNew: false,
      isTop: false,
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete product?")) return;
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
    load();
  };

  if (error === "Unauthorized — login first") {
    return (
      <div className="card-surface p-8 text-center">
        <p className="mb-4">{error}</p>
        <Link href="/admin" className="btn-primary">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-xs text-muted">
          Demo mode: in-memory store (connect Supabase for production)
        </p>
      </div>

      <form onSubmit={save} className="card-surface grid gap-3 p-6 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Add product
        </h2>
        <input
          className="input sm:col-span-2"
          placeholder="Name (UK)"
          value={form.nameUk}
          onChange={(e) => setForm({ ...form, nameUk: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Brand"
          value={form.brandName}
          onChange={(e) => setForm({ ...form, brandName: e.target.value })}
        />
        <input
          className="input"
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="Old price"
          value={form.oldPrice}
          onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
        />
        <input
          className="input"
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Detection range (m)"
          value={form.detectionRangeM}
          onChange={(e) =>
            setForm({ ...form, detectionRangeM: e.target.value })
          }
        />
        <select
          className="input"
          value={form.categorySlug}
          onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
        >
          <option value="teplovizori">Тепловізори</option>
          <option value="pricili">Тепловізійні приціли</option>
          <option value="pricili-pnb">Приціли нічного бачення</option>
          <option value="binokli">Тепловізійні біноклі</option>
          <option value="pnb">ПНБ / нічне бачення</option>
          <option value="nasadky">Насадки</option>
          <option value="aksesuary">Аксесуари</option>
        </select>
        <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isHit}
              onChange={(e) => setForm({ ...form, isHit: e.target.checked })}
            />
            Hit
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
            />
            New
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isTop}
              onChange={(e) => setForm({ ...form, isTop: e.target.checked })}
            />
            Top
          </label>
        </div>
        <button type="submit" className="btn-primary sm:col-span-2">
          Save
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Cat</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Range m</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">{p.nameUk}</td>
                <td className="px-4 py-3 text-muted">{p.brandName}</td>
                <td className="px-4 py-3 text-xs text-muted">{p.categorySlug}</td>
                <td className="px-4 py-3">{formatPrice(p.price)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {p.detectionRangeM ?? "—"}
                </td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3 text-xs">
                  {[p.isHit && "hit", p.isNew && "new", p.isTop && "top"]
                    .filter(Boolean)
                    .join(", ")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => remove(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
