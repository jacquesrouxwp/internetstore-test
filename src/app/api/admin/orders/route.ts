import { NextRequest, NextResponse } from "next/server";
import {
  getRuntimeOrderById,
  getRuntimeOrders,
  updateRuntimeOrderStatus,
} from "@/data/seed";
import type { OrderStatus } from "@/types";
import { requireAdminApi } from "@/lib/admin/auth";
import { ORDER_STATUS_FLOW } from "@/lib/admin/constants";

const ALLOWED: OrderStatus[] = [
  ...ORDER_STATUS_FLOW,
  "cancelled",
];

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const order = getRuntimeOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  }

  const status = req.nextUrl.searchParams.get("status");
  let orders = getRuntimeOrders();
  if (status && status !== "all") {
    orders = orders.filter((o) => o.status === status);
  }

  return NextResponse.json({ orders });
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

  const order = updateRuntimeOrderStatus(id, status);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
