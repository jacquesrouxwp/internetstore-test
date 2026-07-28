"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { NewsForm } from "@/components/admin/NewsForm";

export default function AdminNewsNewPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/news" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Блог
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Нова стаття</h1>
      </div>
      <NewsForm
        onSubmit={async (payload) => {
          const res = await fetch("/api/admin/news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Помилка");
          router.push(`/admin/news/${data.post.id}`);
          router.refresh();
        }}
      />
    </div>
  );
}
