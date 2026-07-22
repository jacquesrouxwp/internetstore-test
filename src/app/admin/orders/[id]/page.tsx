"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@/lib/admin/constants";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch(`/api/admin/orders?id=${encodeURIComponent(id)}`);
    if (res.status === 404) {
      setError("Замовлення не знайдено");
      return;
    }
    const data = await res.json();
    setOrder(data.order || null);
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status: OrderStatus) => {
    if (!order) return;
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, status }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrder(data.order);
    }
  };

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Link href="/admin/orders" className="text-sky-700 underline">
          ← До замовлень
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">Завантаження…</p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/orders"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Замовлення
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-zinc-500">
            {new Date(order.createdAt).toLocaleString("uk-UA")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS_COLORS[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Покупець
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Ім'я" value={order.customerName} />
          <Row label="Телефон" value={order.customerPhone} />
          <Row label="Email" value={order.customerEmail || "—"} />
          <Row label="Коментар" value={order.comment || "—"} />
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Доставка Nova Poshta
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Метод" value={order.deliveryMethod} />
          <Row label="Місто" value={order.npCityName || "—"} />
          <Row label="Відділення" value={order.npWarehouseName || "—"} />
          <Row
            label="Вартість доставки"
            value={formatPrice(order.deliveryCost)}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Товари
        </h2>
        <ul className="divide-y divide-zinc-100">
          {(order.items || []).map((i) => (
            <li
              key={i.id}
              className="flex justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
            >
              <span>
                {i.productName}{" "}
                <span className="text-zinc-400">× {i.quantity}</span>
              </span>
              <span className="tabular-nums font-medium">
                {formatPrice(i.price * i.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Підсумок</span>
            <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Доставка</span>
            <span className="tabular-nums">
              {formatPrice(order.deliveryCost)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-zinc-900">
            <span>Разом</span>
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </div>
          <p className="pt-1 text-xs text-zinc-400">
            Оплата: {order.paymentMethod} · {order.paymentStatus}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Змінити статус
        </h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_FLOW.map((s) => (
            <button
              key={s}
              type="button"
              disabled={order.status === s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                order.status === s
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
          {order.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => setStatus("cancelled")}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Скасувати
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
