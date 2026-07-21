"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    (async () => {
      // simple check via products endpoint
      const auth = await fetch("/api/admin/products");
      if (auth.status === 401) {
        setUnauthorized(true);
        return;
      }
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    })();
  }, []);

  if (unauthorized) {
    return (
      <div className="card-surface p-8 text-center">
        <Link href="/admin" className="btn-primary">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Orders</h1>
      {!orders.length ? (
        <div className="card-surface p-10 text-center text-muted">
          No orders yet (demo in-memory store resets on redeploy)
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-sm text-muted">
                    {o.customerName} · {o.customerPhone}
                  </p>
                  {o.npCityName && (
                    <p className="mt-1 text-xs text-muted">
                      {o.npCityName}
                      {o.npWarehouseName ? ` · ${o.npWarehouseName}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(o.total)}</p>
                  <p className="text-xs uppercase text-muted">
                    {o.status} · {o.paymentMethod}
                  </p>
                </div>
              </div>
              {o.items && (
                <ul className="mt-3 border-t border-line pt-3 text-sm text-muted">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.productName} × {i.quantity}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
