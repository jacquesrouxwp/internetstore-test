"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

export default function AdminNewsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`/api/admin/news?${params}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotal(data.total || 0);
    setCategories(data.categories || []);
    setLoading(false);
  }, [q, category, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string, title: string) => {
    if (!confirm(`Видалити «${title}»?`)) return;
    const res = await fetch(`/api/admin/news?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Видалено");
      load();
    } else {
      const d = await res.json();
      setMsg(d.error || "Помилка");
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Блог / Новини</h1>
          <p className="text-sm text-zinc-500">
            {total} статей · головна карусель + /blog
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Нова стаття
        </Link>
      </div>

      {msg && (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm">{msg}</p>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          className="min-w-[160px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Пошук за назвою / slug…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">Усі рубрики</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="all">Усі статуси</option>
          <option value="published">Опубліковані</option>
          <option value="draft">Чернетки</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load();
          }}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          Знайти
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Стаття</th>
              <th className="px-4 py-3 font-medium">Рубрика</th>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                  Завантаження…
                </td>
              </tr>
            ) : !posts.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                  Немає статей. Створіть або виконайте SQL 005_blog_posts_table.sql
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                        {p.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.coverUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">{p.titleUk}</p>
                        <p className="text-xs text-zinc-400">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {p.category || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {p.publishedAt
                      ? new Date(p.publishedAt).toLocaleDateString("uk-UA")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.published ? (
                      <span className="text-emerald-700">Опубл.</span>
                    ) : (
                      <span className="text-zinc-400">Чернетка</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {p.published && (
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-zinc-500 hover:underline"
                        >
                          Сайт
                        </a>
                      )}
                      <Link
                        href={`/admin/news/${p.id}`}
                        className="text-xs font-medium text-sky-700 hover:underline"
                      >
                        Редагувати
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(p.id, p.titleUk)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
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
