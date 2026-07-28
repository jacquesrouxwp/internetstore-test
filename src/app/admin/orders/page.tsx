"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_ALL,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@/lib/admin/constants";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [status, q, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setOrderStatus = async (id: string, next: OrderStatus) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next, notify: true }),
    });
    if (res.ok) load();
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("format", "csv");
    params.set("limit", "1000");
    window.open(`/api/admin/orders?${params}`, "_blank");
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Замовлення</h1>
          <p className="text-sm text-zinc-500">
            {total} знайдено · фільтри, CSV, статуси з повідомленням
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Експорт CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          className="min-w-[180px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Номер, телефон, ім'я…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <input
          type="date"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={dateFrom}
          onChange={(e) => {
            setPage(1);
            setDateFrom(e.target.value);
          }}
        />
        <input
          type="date"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={dateTo}
          onChange={(e) => {
            setPage(1);
            setDateTo(e.target.value);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load();
          }}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Знайти
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterBtn
          active={status === "all"}
          onClick={() => {
            setPage(1);
            setStatus("all");
          }}
          label="Усі"
        />
        {ORDER_STATUS_ALL.map((s) => (
          <FilterBtn
            key={s}
            active={status === s}
            onClick={() => {
              setPage(1);
              setStatus(s);
            }}
            label={ORDER_STATUS_LABELS[s]}
          />
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-400">Завантаження…</p>
      ) : !orders.length ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500 shadow-sm">
          Замовлень не знайдено.
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
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ORDER_STATUS_COLORS[o.status] || "bg-zinc-100"}`}
                    >
                      {ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                    {o.trackingNumber ? (
                      <span className="text-xs text-violet-700">
                        ТТН {o.trackingNumber}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    {o.customerName} ·{" "}
                    <a
                      href={`tel:${o.customerPhone.replace(/[^\d+]/g, "")}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {o.customerPhone}
                    </a>
                  </p>
                  {o.npCityName && (
                    <p className="mt-1 text-xs text-zinc-500">
                      НП: {o.npCityName}
                      {o.npWarehouseName ? ` · ${o.npWarehouseName}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {new Date(o.createdAt).toLocaleString("uk-UA")} ·{" "}
                    {o.paymentMethod} · {o.paymentStatus}
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

              <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                <span className="self-center text-xs text-zinc-400">
                  Статус:
                </span>
                {ORDER_STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={o.status === s}
                    onClick={() => setOrderStatus(o.id, s)}
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
                    onClick={() => setOrderStatus(o.id, "cancelled")}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Скасувати
                  </button>
                )}
                {o.status !== "returned" && (
                  <button
                    type="button"
                    onClick={() => setOrderStatus(o.id, "returned")}
                    className="rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                  >
                    Повернення
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

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
