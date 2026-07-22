"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/admin/dashboard";

  const [email, setEmail] = useState("admin@pro-optics.ua");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => {
        if (r.ok)
          router.replace(
            from.startsWith("/admin/") ? from : "/admin/dashboard"
          );
      })
      .catch(() => {});
  }, [router, from]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка входу");
      router.push(from.startsWith("/admin/") ? from : "/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Pro-Optics
        </p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">
          Вхід для власника
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Окремий кабінет адміністратора. Покупці сюди доступу не мають.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-600">Email</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-600">Пароль</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Вхід…" : "Увійти"}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-400">
        Demo: admin@pro-optics.ua / admin123
        <br />
        Або ADMIN_EMAIL / ADMIN_PASSWORD у env.
        <br />
        З Supabase — лише користувачі з роллю{" "}
        <code className="rounded bg-zinc-100 px-1">admin</code>.
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
          Завантаження…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
