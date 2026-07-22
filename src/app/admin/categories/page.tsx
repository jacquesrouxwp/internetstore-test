"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/types";

const empty = {
  nameUk: "",
  nameRu: "",
  slug: "",
  descriptionUk: "",
  sortOrder: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setError("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = {
      id: editId || undefined,
      nameUk: form.nameUk,
      nameRu: form.nameRu || form.nameUk,
      slug: form.slug || undefined,
      descriptionUk: form.descriptionUk || null,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    };
    const res = await fetch("/api/admin/categories", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? { ...payload, id: editId } : payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Помилка");
      return;
    }
    reset();
    load();
  };

  const startEdit = (c: Category) => {
    setEditId(c.id);
    setForm({
      nameUk: c.nameUk,
      nameRu: c.nameRu,
      slug: c.slug,
      descriptionUk: c.descriptionUk || "",
      sortOrder: c.sortOrder != null ? String(c.sortOrder) : "",
    });
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Видалити категорію «${name}»? Товари відв'яжуться.`)) return;
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    if (editId === id) reset();
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Категорії</h1>
        <p className="text-sm text-zinc-500">
          Додавання, редагування, видалення. Прив&apos;язка товарів — у картці
          товару.
        </p>
      </div>

      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-sm font-semibold text-zinc-700">
          {editId ? "Редагувати категорію" : "Нова категорія"}
        </h2>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Назва (УКР) *</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.nameUk}
            onChange={(e) => setForm({ ...form, nameUk: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Назва (РУС)</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.nameRu}
            onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">
            Slug (необов&apos;язково)
          </span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="teplovizori"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Порядок</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-xs text-zinc-500">
            Опис (УКР)
          </span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.descriptionUk}
            onChange={(e) =>
              setForm({ ...form, descriptionUk: e.target.value })
            }
          />
        </label>
        {error && (
          <p className="sm:col-span-2 text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            {editId ? "Зберегти" : "Додати"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              Скасувати
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Порядок</th>
              <th className="px-4 py-3">Назва УКР</th>
              <th className="px-4 py-3">Назва РУС</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 tabular-nums text-zinc-500">
                  {c.sortOrder ?? "—"}
                </td>
                <td className="px-4 py-3 font-medium">{c.nameUk}</td>
                <td className="px-4 py-3 text-zinc-600">{c.nameRu}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {c.slug}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="mr-3 text-sky-700 hover:underline"
                    onClick={() => startEdit(c)}
                  >
                    Редагувати
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => remove(c.id, c.nameUk)}
                  >
                    Видалити
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
