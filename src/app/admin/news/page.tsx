"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

export default function AdminNewsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/news");
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Новини / Блог</h1>
          <p className="text-sm text-zinc-500">
            {posts.length} статей · публікація на головній та /blog
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
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
                  Немає статей. Створіть першу або виконайте SQL 004.
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
    </div>
  );
}
