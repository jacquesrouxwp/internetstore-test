"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  products: number;
  published: number;
  brands: number;
  categories: number;
  orders: number;
  newOrders: number;
  lowStock: number;
  outOfStock: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [mode, setMode] = useState("");

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats);
        if (d.mode) setMode(d.mode);
      })
      .catch(() => {});
  }, []);

  const cards = stats
    ? [
        {
          label: "Товари",
          value: stats.products,
          sub: `${stats.published} опубліковано`,
          href: "/admin/products",
        },
        {
          label: "Нові замовлення",
          value: stats.newOrders,
          sub: `усього ${stats.orders}`,
          href: "/admin/orders",
          highlight: stats.newOrders > 0,
        },
        {
          label: "Категорії",
          value: stats.categories,
          sub: "керування",
          href: "/admin/categories",
        },
        {
          label: "Бренди",
          value: stats.brands,
          sub: "керування",
          href: "/admin/brands",
        },
        {
          label: "Закінчується",
          value: stats.lowStock,
          sub: "≤ 2 шт на складі",
          href: "/admin/products",
        },
        {
          label: "Немає в наявності",
          value: stats.outOfStock,
          sub: "0 шт",
          href: "/admin/products",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Головна</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Кабінет власника магазину
          {mode ? (
            <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium uppercase text-zinc-600">
              {mode === "demo" ? "demo store" : "supabase"}
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 ${
              c.highlight
                ? "border-amber-300 ring-1 ring-amber-100"
                : "border-zinc-200"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {c.label}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">
              {c.value}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{c.sub}</p>
          </Link>
        ))}
        {!stats && (
          <div className="col-span-full py-12 text-center text-sm text-zinc-400">
            Завантаження…
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/admin/products/new" label="+ Додати товар" primary />
        <QuickLink href="/admin/orders" label="Замовлення" />
        <QuickLink href="/admin/import" label="Імпорт з Prom.ua" />
        <QuickLink href="/admin/categories" label="Категорії" />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
        primary
          ? "bg-red-600 text-white hover:bg-red-700"
          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      {label}
    </Link>
  );
}
