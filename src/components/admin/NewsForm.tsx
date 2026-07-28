"use client";

import { useMemo, useState } from "react";
import type { BlogPost } from "@/lib/blog/types";
import { slugify, cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

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
    category: p?.category || "Гайди",
    published: p?.published === true,
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
}: {
  initial?: BlogPost | null;
  onSubmit: (
    payload: Record<string, unknown>,
    mode: "draft" | "publish"
  ) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [lang, setLang] = useState<"uk" | "ru">("uk");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const autoSlug = useMemo(
    () => slugify(form.titleUk || form.titleRu || "post").slice(0, 80),
    [form.titleUk, form.titleRu]
  );

  const uploadCover = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("files", files[0]);
      fd.append("productKey", `blog-${initial?.id || "new"}`);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (data.urls?.[0]) set("coverUrl", data.urls[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload error");
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = (mode: "draft" | "publish") => {
    const published = mode === "publish";
    const slug =
      (slugTouched ? form.slug : form.slug || autoSlug).trim() || autoSlug;
    return {
      titleUk: form.titleUk,
      titleRu: form.titleRu || form.titleUk,
      slug,
      excerptUk: form.excerptUk || null,
      excerptRu: form.excerptRu || null,
      bodyUk: form.bodyUk || null,
      bodyRu: form.bodyRu || null,
      coverUrl: form.coverUrl || null,
      category: form.category || null,
      published,
      publishedAt: published
        ? form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : new Date().toISOString()
        : form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : null,
      metaTitleUk: form.metaTitleUk || null,
      metaTitleRu: form.metaTitleRu || null,
      metaDescriptionUk: form.metaDescriptionUk || null,
      metaDescriptionRu: form.metaDescriptionRu || null,
    };
  };

  const save = async (mode: "draft" | "publish") => {
    if (!form.titleUk.trim()) {
      setError("Заголовок (УКР) обов'язковий");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(buildPayload(mode), mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const previewSlug =
    (slugTouched ? form.slug : form.slug || autoSlug) || autoSlug;

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(["uk", "ru"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold uppercase",
              lang === l
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-600"
            )}
          >
            {l === "uk" ? "Українська" : "Русский"}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Контент ({lang.toUpperCase()})
        </h2>
        <div className="space-y-4">
          {lang === "uk" ? (
            <>
              <label className="block">
                <span className={label}>Заголовок (УКР) *</span>
                <input
                  className={field}
                  required
                  value={form.titleUk}
                  onChange={(e) => {
                    set("titleUk", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value).slice(0, 80));
                  }}
                />
              </label>
              <label className="block">
                <span className={label}>Анонс</span>
                <textarea
                  className={cn(field, "min-h-[70px]")}
                  value={form.excerptUk}
                  onChange={(e) => set("excerptUk", e.target.value)}
                />
              </label>
              <div>
                <span className={label}>Повний текст (HTML / WYSIWYG)</span>
                <RichTextEditor
                  value={form.bodyUk}
                  onChange={(html) => set("bodyUk", html)}
                  placeholder="Текст статті…"
                />
              </div>
            </>
          ) : (
            <>
              <label className="block">
                <span className={label}>Заголовок (РУС)</span>
                <input
                  className={field}
                  value={form.titleRu}
                  onChange={(e) => set("titleRu", e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>Анонс</span>
                <textarea
                  className={cn(field, "min-h-[70px]")}
                  value={form.excerptRu}
                  onChange={(e) => set("excerptRu", e.target.value)}
                />
              </label>
              <div>
                <span className={label}>Повний текст (HTML / WYSIWYG)</span>
                <RichTextEditor
                  value={form.bodyRu}
                  onChange={(html) => set("bodyRu", html)}
                  placeholder="Текст статьи…"
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Обкладинка · рубрика · slug
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-wrap items-start gap-4">
            <div className="h-28 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              {form.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  Немає фото
                </div>
              )}
            </div>
            <div className="min-w-[200px] flex-1 space-y-2">
              <label className="inline-block cursor-pointer rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
                {uploading ? "…" : "Завантажити обкладинку"}
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
          <label className="block">
            <span className={label}>Рубрика</span>
            <input
              className={field}
              list="blog-cats"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
            <datalist id="blog-cats">
              <option value="Гайди" />
              <option value="Огляди" />
              <option value="Сервіс" />
              <option value="Новини" />
            </datalist>
          </label>
          <label className="block">
            <span className={label}>Slug (URL)</span>
            <input
              className={field}
              value={slugTouched ? form.slug : form.slug || autoSlug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
            />
            <span className="mt-1 block text-[11px] text-zinc-400">
              /blog/{previewSlug}
            </span>
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
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          SEO ({lang.toUpperCase()})
        </h2>
        {lang === "uk" ? (
          <div className="grid gap-4">
            <label className="block">
              <span className={label}>Meta title UK</span>
              <input
                className={field}
                value={form.metaTitleUk}
                onChange={(e) => set("metaTitleUk", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>Meta description UK</span>
              <textarea
                className={cn(field, "min-h-[60px]")}
                value={form.metaDescriptionUk}
                onChange={(e) => set("metaDescriptionUk", e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="block">
              <span className={label}>Meta title RU</span>
              <input
                className={field}
                value={form.metaTitleRu}
                onChange={(e) => set("metaTitleRu", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>Meta description RU</span>
              <textarea
                className={cn(field, "min-h-[60px]")}
                value={form.metaDescriptionRu}
                onChange={(e) => set("metaDescriptionRu", e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => save("draft")}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {saving ? "…" : "Зберегти чернетку"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => save("publish")}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "…" : "Опублікувати"}
        </button>
        {previewSlug && (
          <a
            href={`/blog/${previewSlug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-sky-700 hover:underline"
          >
            Передпрогляд →
          </a>
        )}
      </div>
    </div>
  );
}
