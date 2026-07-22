"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Brand, Category } from "@/types";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminNewProductPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => {
        setBrands(d.brands || []);
        setCategories(d.categories || []);
      })
      .catch(() => {});
  }, []);

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
      <h1 className="text-2xl font-bold text-zinc-900">Новий товар</h1>

      <ProductForm
        brands={brands}
        categories={categories}
        submitLabel="Створити товар"
        onSubmit={async (payload) => {
          const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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
