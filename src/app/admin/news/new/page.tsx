"use client";

import { useRouter } from "next/navigation";
import { NewsForm } from "@/components/admin/NewsForm";

export default function AdminNewsNewPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Нова стаття</h1>
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
