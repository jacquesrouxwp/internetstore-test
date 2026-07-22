"use client";

import { useCallback, useEffect, useState } from "react";
import type { Brand } from "@/types";

const empty = { name: "", slug: "", logoUrl: "" };

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/brands");
    const data = await res.json();
    setBrands(data.brands || []);
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
      name: form.name,
      slug: form.slug || undefined,
      logoUrl: form.logoUrl || null,
    };
    const res = await fetch("/api/admin/brands", {
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

  const startEdit = (b: Brand) => {
    setEditId(b.id);
    setForm({
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl || "",
    });
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Видалити бренд «${name}»?`)) return;
    await fetch(`/api/admin/brands?id=${id}`, { method: "DELETE" });
    if (editId === id) reset();
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Бренди</h1>
        <p className="text-sm text-zinc-500">
          Керування брендами. Прив&apos;язка до товарів — у формі товару.
        </p>
      </div>

      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-3"
      >
        <h2 className="sm:col-span-3 text-sm font-semibold text-zinc-700">
          {editId ? "Редагувати бренд" : "Новий бренд"}
        </h2>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Назва *</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Slug</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">
            URL логотипу
          </span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="/brands/hikmicro.png"
          />
        </label>
        {error && (
          <p className="sm:col-span-3 text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-2 sm:col-span-3">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <article
            key={b.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain p-1"
                />
              ) : (
                <span className="text-xs text-zinc-400">logo</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-zinc-900">{b.name}</p>
              <p className="truncate font-mono text-xs text-zinc-400">
                {b.slug}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-xs">
              <button
                type="button"
                className="text-sky-700 hover:underline"
                onClick={() => startEdit(b)}
              >
                Змінити
              </button>
              <button
                type="button"
                className="text-red-600 hover:underline"
                onClick={() => remove(b.id, b.name)}
              >
                Видалити
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
