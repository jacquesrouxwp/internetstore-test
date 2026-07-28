"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Order } from "@/types";
import { formatPrice } from "@/lib/utils";

type Legal = {
  entityName?: string;
  edrpou?: string;
  ipn?: string;
  legalAddress?: string;
};
type Site = {
  siteName?: string;
  phones?: string[];
  email?: string;
  address?: string;
};

export default function OrderPrintPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [legal, setLegal] = useState<Legal>({});
  const [site, setSite] = useState<Site>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/orders?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order || null));
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setLegal((d.settings?.legal as Legal) || {});
        setSite((d.settings?.site as Site) || {});
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (!order) {
    return <p className="p-8 text-sm text-zinc-500">Завантаження…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-zinc-900 print:p-4">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-sheet,
          .print-sheet * {
            visibility: visible;
          }
          .print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="print-sheet">
        <header className="mb-6 border-b border-zinc-300 pb-4">
          <h1 className="text-xl font-bold">
            {site.siteName || "Pro-Optics"} — рахунок / накладна
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Замовлення <strong>{order.orderNumber}</strong> ·{" "}
            {new Date(order.createdAt).toLocaleString("uk-UA")}
          </p>
          {(legal.entityName || legal.edrpou) && (
            <p className="mt-2 text-xs text-zinc-500">
              {legal.entityName}
              {legal.edrpou ? ` · ЄДРПОУ ${legal.edrpou}` : ""}
              {legal.ipn ? ` · ІПН ${legal.ipn}` : ""}
              {legal.legalAddress ? ` · ${legal.legalAddress}` : ""}
            </p>
          )}
          {site.phones?.[0] && (
            <p className="text-xs text-zinc-500">
              {site.phones.join(" · ")}
              {site.email ? ` · ${site.email}` : ""}
            </p>
          )}
        </header>

        <section className="mb-6 text-sm">
          <h2 className="mb-1 font-semibold">Покупець</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.customerEmail && <p>{order.customerEmail}</p>}
          {(order.npCityName || order.npWarehouseName) && (
            <p className="mt-1 text-zinc-600">
              НП: {order.npCityName}
              {order.npWarehouseName ? `, ${order.npWarehouseName}` : ""}
            </p>
          )}
          {order.trackingNumber && (
            <p className="mt-1">ТТН: {order.trackingNumber}</p>
          )}
        </section>

        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left">
              <th className="py-2 pr-2">Товар</th>
              <th className="py-2 pr-2 text-right">Ціна</th>
              <th className="py-2 pr-2 text-right">К-сть</th>
              <th className="py-2 text-right">Сума</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((i) => (
              <tr key={i.id} className="border-b border-zinc-100">
                <td className="py-2 pr-2">{i.productName}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {formatPrice(i.price)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {i.quantity}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatPrice(i.price * i.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Підсумок</span>
            <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Доставка</span>
            <span className="tabular-nums">
              {formatPrice(order.deliveryCost)}
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-bold">
            <span>Разом</span>
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </div>
          <p className="pt-2 text-xs text-zinc-500">
            Оплата: {order.paymentMethod} ({order.paymentStatus})
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print mt-8 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Друкувати
        </button>
      </div>
    </div>
  );
}
