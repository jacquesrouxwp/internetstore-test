"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@/lib/admin/constants";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    const params =
      status && status !== "all" ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/orders${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter);
  }, [load, filter]);

  const setStatus = async (id: string, status: OrderStatus) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load(filter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Замовлення</h1>
        <p className="text-sm text-zinc-500">
          Статуси: Новий → В обробці → Відправлено → Виконано
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterBtn
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Усі"
        />
        {ORDER_STATUS_FLOW.map((s) => (
          <FilterBtn
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={ORDER_STATUS_LABELS[s]}
          />
        ))}
        <FilterBtn
          active={filter === "cancelled"}
          onClick={() => setFilter("cancelled")}
          label="Скасовано"
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-400">
          Завантаження…
        </p>
      ) : !orders.length ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500 shadow-sm">
          Замовлень поки немає.
          <br />
          <span className="text-xs text-zinc-400">
            Demo: in-memory store скидається після redeploy.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <article
              key={o.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-semibold text-zinc-900 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ORDER_STATUS_COLORS[o.status]}`}
                    >
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    {o.customerName} · {o.customerPhone}
                    {o.customerEmail ? ` · ${o.customerEmail}` : ""}
                  </p>
                  {o.npCityName && (
                    <p className="mt-1 text-xs text-zinc-500">
                      НП: {o.npCityName}
                      {o.npWarehouseName ? ` · ${o.npWarehouseName}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {new Date(o.createdAt).toLocaleString("uk-UA")} ·{" "}
                    {o.paymentMethod}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-zinc-900">
                    {formatPrice(o.total)}
                  </p>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="mt-1 inline-block text-xs font-medium text-sky-700 hover:underline"
                  >
                    Деталі →
                  </Link>
                </div>
              </div>

              {o.items && o.items.length > 0 && (
                <ul className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.productName} × {i.quantity} —{" "}
                      {formatPrice(i.price * i.quantity)}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                <span className="self-center text-xs text-zinc-400">
                  Змінити статус:
                </span>
                {ORDER_STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={o.status === s}
                    onClick={() => setStatus(o.id, s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      o.status === s
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
                {o.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => setStatus(o.id, "cancelled")}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Скасувати
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-zinc-900 text-white"
          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}
