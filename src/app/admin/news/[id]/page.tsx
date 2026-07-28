"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";
import { NewsForm } from "@/components/admin/NewsForm";

export default function AdminNewsEditPage() {
  const params = useParams();
  const id = String(params.id || "");
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/news?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.post) setPost(d.post);
        else setError(d.error || "Не знайдено");
      });
  }, [id]);

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/admin/news" className="mt-4 inline-block text-sky-700">
          ← Назад
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">Завантаження…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-zinc-900">Редагувати статтю</h1>
        <Link
          href={`/blog/${post.slug}`}
          target="_blank"
          className="text-sm text-sky-700 hover:underline"
        >
          Відкрити на сайті →
        </Link>
      </div>
      <NewsForm
        initial={post}
        submitLabel="Оновити"
        onSubmit={async (payload) => {
          const res = await fetch("/api/admin/news", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, id: post.id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Помилка");
          setPost(data.post);
          router.refresh();
        }}
      />
    </div>
  );
}
