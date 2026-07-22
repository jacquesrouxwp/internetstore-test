"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Brand, Category, Product } from "@/types";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminEditProductPage() {
  const params = useParams();
  const id = String(params.id || "");
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setError("Товар не знайдено");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProduct(data.product || null);
      // also load lists
      const list = await fetch("/api/admin/products").then((r) => r.json());
      setBrands(list.brands || []);
      setCategories(list.categories || []);
      setLoading(false);
    })().catch(() => {
      setError("Помилка завантаження");
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">Завантаження…</p>
    );
  }

  if (error || !product) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{error || "Не знайдено"}</p>
        <Link href="/admin/products" className="text-sm text-sky-700 underline">
          До списку товарів
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Товари
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Редагувати товар</h1>
        <p className="text-sm text-zinc-500">{product.nameUk}</p>
      </div>

      <ProductForm
        initial={product}
        brands={brands}
        categories={categories}
        submitLabel="Зберегти зміни"
        onSubmit={async (payload) => {
          const res = await fetch("/api/admin/products", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, id: product.id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Помилка");
          router.push("/admin/products");
          router.refresh();
        }}
      />
    </div>
  );
}
