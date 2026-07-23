import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@/types";
import { requireAdminApi } from "@/lib/admin/auth";
import { ORDER_STATUS_FLOW } from "@/lib/admin/constants";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminGetOrder,
  adminListOrders,
  adminUpdateOrderStatus,
} from "@/lib/db/admin-repo";
import {
  getRuntimeOrderById,
  getRuntimeOrders,
  updateRuntimeOrderStatus,
} from "@/data/seed";

const ALLOWED: OrderStatus[] = [...ORDER_STATUS_FLOW, "cancelled"];

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  try {
    if (hasServiceSupabase()) {
      const id = req.nextUrl.searchParams.get("id");
      if (id) {
        const order = await adminGetOrder(id);
        if (!order) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ order, source: "supabase" });
      }
      const status = req.nextUrl.searchParams.get("status");
      const orders = await adminListOrders(status);
      return NextResponse.json({ orders, source: "supabase" });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const order = getRuntimeOrderById(id);
      if (!order) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ order, source: "memory" });
    }
    const status = req.nextUrl.searchParams.get("status");
    let orders = getRuntimeOrders();
    if (status && status !== "all") {
      orders = orders.filter((o) => o.status === status);
    }
    return NextResponse.json({ orders, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = await req.json();
  const id = String(body.id || "");
  const status = body.status as OrderStatus;

  if (!id || !status) {
    return NextResponse.json(
      { error: "id and status required" },
      { status: 400 }
    );
  }
  if (!ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    if (hasServiceSupabase()) {
      const order = await adminUpdateOrderStatus(id, status);
      if (!order) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ order, source: "supabase" });
    }
    const order = updateRuntimeOrderStatus(id, status);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ order, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
