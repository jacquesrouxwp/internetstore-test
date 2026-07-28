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
  const [managerComment, setManagerComment] = useState("");
  const [msg, setMsg] = useState("");
  const [ttnReady, setTtnReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/admin/orders?id=${encodeURIComponent(id)}`);
    if (res.status === 404) {
      setError("Замовлення не знайдено");
      return;
    }
    const data = await res.json();
    setOrder(data.order || null);
    setManagerComment(data.order?.managerComment || "");
  };

  useEffect(() => {
    if (id) load();
    fetch("/api/admin/orders/ttn")
      .then((r) => r.json())
      .then((d) => setTtnReady(Boolean(d.ready)))
      .catch(() => setTtnReady(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    if (!order) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, ...body }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Помилка");
      return;
    }
    setOrder(data.order);
    if (data.notify) setMsg("Статус оновлено, повідомлення надіслано");
    else setMsg("Збережено");
  };

  const setStatus = (status: OrderStatus) =>
    patch({ status, notify: true });

  const saveManager = () =>
    patch({ managerComment, notify: false });

  const createTtn = async () => {
    if (!order || !ttnReady) return;
    if (!confirm("Створити ТТН Нової Пошти для цього замовлення?")) return;
    setBusy(true);
    setMsg("Створення ТТН…");
    const res = await fetch("/api/admin/orders/ttn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, notify: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || data.hint || "Помилка ТТН");
      return;
    }
    setOrder(data.order);
    setMsg(`ТТН ${data.ttn} створено`);
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

  const tel = order.customerPhone.replace(/[^\d+]/g, "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/orders"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Замовлення
      </Link>

      {msg && (
        <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-800">
          {msg}
        </p>
      )}

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

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/orders/${order.id}/print`}
          target="_blank"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Друк рахунку
        </Link>
        <button
          type="button"
          disabled={!ttnReady || busy || Boolean(order.trackingNumber)}
          title={
            !ttnReady
              ? "Задайте NOVA_POSHTA_API_KEY і відправника в Налаштуваннях"
              : order.trackingNumber
                ? "ТТН вже є"
                : "Створити експрес-накладну"
          }
          onClick={createTtn}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {order.trackingNumber
            ? `ТТН ${order.trackingNumber}`
            : "Створити ТТН"}
        </button>
        {order.trackingUrl && (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800"
          >
            Відстежити
          </a>
        )}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Покупець
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Ім'я" value={order.customerName} />
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Телефон</dt>
            <dd className="text-right font-medium">
              <a href={`tel:${tel}`} className="text-sky-700 hover:underline">
                {order.customerPhone}
              </a>
            </dd>
          </div>
          <Row label="Email" value={order.customerEmail || "—"} />
          <Row label="Коментар клієнта" value={order.comment || "—"} />
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Доставка Nova Poshta
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Місто" value={order.npCityName || "—"} />
          <Row label="Відділення" value={order.npWarehouseName || "—"} />
          <Row label="Доставка" value={formatPrice(order.deliveryCost)} />
          <Row label="ТТН" value={order.trackingNumber || "—"} />
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
          Коментар менеджера (внутрішній)
        </h2>
        <textarea
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          rows={3}
          value={managerComment}
          onChange={(e) => setManagerComment(e.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={saveManager}
          className="mt-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          Зберегти коментар
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Змінити статус (+ сповіщення)
        </h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_FLOW.map((s) => (
            <button
              key={s}
              type="button"
              disabled={order.status === s || busy}
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
          <button
            type="button"
            disabled={busy}
            onClick={() => setStatus("cancelled")}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
          >
            Скасувати
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setStatus("returned")}
            className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-medium text-orange-700"
          >
            Повернення
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-zinc-900">
        {value}
      </dd>
    </div>
  );
}
