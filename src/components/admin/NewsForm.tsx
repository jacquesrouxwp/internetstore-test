"use client";

import { useState } from "react";
import type { BlogPost } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type FormState = {
  titleUk: string;
  titleRu: string;
  slug: string;
  excerptUk: string;
  excerptRu: string;
  bodyUk: string;
  bodyRu: string;
  coverUrl: string;
  category: string;
  published: boolean;
  publishedAt: string;
  metaTitleUk: string;
  metaTitleRu: string;
  metaDescriptionUk: string;
  metaDescriptionRu: string;
};

function toForm(p?: BlogPost | null): FormState {
  return {
    titleUk: p?.titleUk || "",
    titleRu: p?.titleRu || "",
    slug: p?.slug || "",
    excerptUk: p?.excerptUk || "",
    excerptRu: p?.excerptRu || "",
    bodyUk: p?.bodyUk || "",
    bodyRu: p?.bodyRu || "",
    coverUrl: p?.coverUrl || "",
    category: p?.category || "",
    published: p?.published !== false,
    publishedAt: p?.publishedAt
      ? p.publishedAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    metaTitleUk: p?.metaTitleUk || "",
    metaTitleRu: p?.metaTitleRu || "",
    metaDescriptionUk: p?.metaDescriptionUk || "",
    metaDescriptionRu: p?.metaDescriptionRu || "",
  };
}

const field =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";
const label = "mb-1 block text-xs font-medium text-zinc-600";

export function NewsForm({
  initial,
  onSubmit,
  submitLabel = "Зберегти",
}: {
  initial?: BlogPost | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const uploadCover = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("files", files[0]);
      fd.append("productKey", `blog-${initial?.id || "new"}`);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (data.urls?.[0]) set("coverUrl", data.urls[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload error");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        titleUk: form.titleUk,
        titleRu: form.titleRu || form.titleUk,
        slug: form.slug || undefined,
        excerptUk: form.excerptUk || null,
        excerptRu: form.excerptRu || null,
        bodyUk: form.bodyUk || null,
        bodyRu: form.bodyRu || null,
        coverUrl: form.coverUrl || null,
        category: form.category || null,
        published: form.published,
        publishedAt: form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : new Date().toISOString(),
        metaTitleUk: form.metaTitleUk || null,
        metaTitleRu: form.metaTitleRu || null,
        metaDescriptionUk: form.metaDescriptionUk || null,
        metaDescriptionRu: form.metaDescriptionRu || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Контент
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Заголовок (УКР) *</span>
            <input
              className={field}
              required
              value={form.titleUk}
              onChange={(e) => set("titleUk", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Заголовок (РУС)</span>
            <input
              className={field}
              value={form.titleRu}
              onChange={(e) => set("titleRu", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Slug (URL)</span>
            <input
              className={field}
              placeholder="avto-z-title"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Рубрика</span>
            <input
              className={field}
              placeholder="Гіди / Огляди / Сервіс"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Анонс (УКР)</span>
            <textarea
              className={cn(field, "min-h-[60px]")}
              value={form.excerptUk}
              onChange={(e) => set("excerptUk", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Анонс (РУС)</span>
            <textarea
              className={cn(field, "min-h-[60px]")}
              value={form.excerptRu}
              onChange={(e) => set("excerptRu", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Текст (УКР) — абзаци через Enter</span>
            <textarea
              className={cn(field, "min-h-[160px] font-mono text-xs")}
              value={form.bodyUk}
              onChange={(e) => set("bodyUk", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Текст (РУС)</span>
            <textarea
              className={cn(field, "min-h-[160px] font-mono text-xs")}
              value={form.bodyRu}
              onChange={(e) => set("bodyRu", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Обкладинка
        </h2>
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-28 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
            {form.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="inline-block cursor-pointer rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
              {uploading ? "…" : "Завантажити"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => uploadCover(e.target.files)}
              />
            </label>
            <input
              className={field}
              placeholder="або URL…"
              value={form.coverUrl}
              onChange={(e) => set("coverUrl", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Публікація та SEO
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            Опубліковано
          </label>
          <label className="block">
            <span className={label}>Дата публікації</span>
            <input
              type="datetime-local"
              className={field}
              value={form.publishedAt}
              onChange={(e) => set("publishedAt", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Meta title UK</span>
            <input
              className={field}
              value={form.metaTitleUk}
              onChange={(e) => set("metaTitleUk", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Meta title RU</span>
            <input
              className={field}
              value={form.metaTitleRu}
              onChange={(e) => set("metaTitleRu", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Meta description UK</span>
            <textarea
              className={cn(field, "min-h-[50px]")}
              value={form.metaDescriptionUk}
              onChange={(e) => set("metaDescriptionUk", e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Meta description RU</span>
            <textarea
              className={cn(field, "min-h-[50px]")}
              value={form.metaDescriptionRu}
              onChange={(e) => set("metaDescriptionRu", e.target.value)}
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {saving ? "…" : submitLabel}
      </button>
    </form>
  );
}
