import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@/types";
import { requireAdminApi } from "@/lib/admin/auth";
import { ORDER_STATUS_ALL } from "@/lib/admin/constants";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminGetOrder,
  adminListOrders,
  adminPatchOrder,
} from "@/lib/db/admin-repo";
import { notifyCustomerStatus } from "@/lib/notify-customer";

const ALLOWED: OrderStatus[] = [...ORDER_STATUS_ALL];

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  try {
    if (!hasServiceSupabase()) {
      return NextResponse.json(
        { error: "Supabase not configured", orders: [], total: 0 },
        { status: 503 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const id = sp.get("id");
    if (id) {
      const order = await adminGetOrder(id);
      if (!order) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ order, source: "supabase" });
    }

    const format = sp.get("format");
    const result = await adminListOrders({
      status: sp.get("status"),
      q: sp.get("q") || undefined,
      dateFrom: sp.get("dateFrom") || undefined,
      dateTo: sp.get("dateTo") || undefined,
      page: Number(sp.get("page") || 1),
      limit:
        format === "csv"
          ? Math.min(2000, Number(sp.get("limit") || 1000))
          : Number(sp.get("limit") || 30),
    });

    if (format === "csv") {
      const header = [
        "order_number",
        "status",
        "created_at",
        "customer_name",
        "customer_phone",
        "customer_email",
        "payment_method",
        "payment_status",
        "subtotal",
        "delivery_cost",
        "total",
        "np_city",
        "np_warehouse",
        "tracking_number",
        "comment",
        "manager_comment",
      ];
      const lines = [header.join(";")];
      for (const o of result.orders) {
        lines.push(
          [
            o.orderNumber,
            o.status,
            o.createdAt,
            csv(o.customerName),
            csv(o.customerPhone),
            csv(o.customerEmail || ""),
            o.paymentMethod,
            o.paymentStatus,
            o.subtotal,
            o.deliveryCost,
            o.total,
            csv(o.npCityName || ""),
            csv(o.npWarehouseName || ""),
            csv(o.trackingNumber || ""),
            csv(o.comment || ""),
            csv(o.managerComment || ""),
          ].join(";")
        );
      }
      const body = "\uFEFF" + lines.join("\n");
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="orders-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ ...result, source: "supabase" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

function csv(s: string) {
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function PATCH(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (body.status != null && !ALLOWED.includes(body.status as OrderStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` },
        { status: 400 }
      );
    }

    const notify = body.notify !== false;
    const prev = await adminGetOrder(id);
    if (!prev) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const order = await adminPatchOrder(id, {
      status: body.status as OrderStatus | undefined,
      managerComment:
        body.managerComment !== undefined
          ? String(body.managerComment || "")
          : undefined,
      trackingNumber:
        body.trackingNumber !== undefined
          ? String(body.trackingNumber || "") || null
          : undefined,
      trackingUrl:
        body.trackingUrl !== undefined
          ? String(body.trackingUrl || "") || null
          : undefined,
      paymentStatus:
        body.paymentStatus != null
          ? String(body.paymentStatus)
          : undefined,
    });

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let notifyResult = null;
    if (
      notify &&
      body.status &&
      body.status !== prev.status &&
      ALLOWED.includes(body.status as OrderStatus)
    ) {
      notifyResult = await notifyCustomerStatus(
        order,
        body.status as OrderStatus
      );
      await adminPatchOrder(id, {
        statusNotifiedAt: new Date().toISOString(),
      });
    }

    const fresh = await adminGetOrder(id);
    return NextResponse.json({
      order: fresh,
      notify: notifyResult,
      source: "supabase",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
