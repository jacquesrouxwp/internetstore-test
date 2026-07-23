import { NextRequest, NextResponse } from "next/server";
import { generateOrderNumber } from "@/lib/utils";
import type { Order, OrderItem, PaymentMethod } from "@/types";
import { sendOrderToTelegram } from "@/lib/telegram";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { isUuid } from "@/lib/supabase/mappers";

function createPaymentUrl(
  order: Order,
  method: PaymentMethod
): string | null {
  if (method === "cod") return null;
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (method === "monobank" && process.env.MONOBANK_TOKEN) {
    return `${site}/checkout?pending=${order.orderNumber}&provider=monobank`;
  }
  if (method === "liqpay" && process.env.LIQPAY_PUBLIC_KEY) {
    return `${site}/checkout?pending=${order.orderNumber}&provider=liqpay`;
  }
  if (method === "wayforpay" && process.env.WAYFORPAY_MERCHANT_ACCOUNT) {
    return `${site}/checkout?pending=${order.orderNumber}&provider=wayforpay`;
  }
  return null;
}

type RequestItem = {
  productId?: string;
  productSlug?: string;
  productName?: string;
  price?: number;
  quantity?: number;
};

/**
 * POST /api/orders
 * CRITICAL: prices & stock from DB only; never trust client prices.
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasServiceSupabase()) {
      return NextResponse.json(
        {
          error:
            "Database not configured. Set SUPABASE_SERVICE_ROLE_KEY and run migrations.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod = "cod",
      comment,
      npCityRef,
      npCityName,
      npWarehouseRef,
      npWarehouseName,
      deliveryCost = 0,
      items = [],
    } = body as {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      paymentMethod?: string;
      comment?: string;
      npCityRef?: string;
      npCityName?: string;
      npWarehouseRef?: string;
      npWarehouseName?: string;
      deliveryCost?: number;
      items?: RequestItem[];
    };

    if (!customerName || !customerPhone || !items?.length) {
      return NextResponse.json(
        { error: "Name, phone and items are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const safeItems: OrderItem[] = [];
    let subtotal = 0;

    // Resolve each line from DB
    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx];
      const qty = Math.max(1, Math.floor(Number(raw.quantity) || 1));
      let productRow: Record<string, unknown> | null = null;

      if (raw.productId && isUuid(String(raw.productId))) {
        const { data } = await supabase
          .from("products")
          .select("id, slug, name_uk, price, stock, published")
          .eq("id", raw.productId)
          .maybeSingle();
        productRow = data as Record<string, unknown> | null;
      }

      if (!productRow && raw.productSlug) {
        const { data } = await supabase
          .from("products")
          .select("id, slug, name_uk, price, stock, published")
          .eq("slug", raw.productSlug)
          .maybeSingle();
        productRow = data as Record<string, unknown> | null;
      }

      if (!productRow || productRow.published === false) {
        return NextResponse.json(
          {
            error: `Product not found: ${raw.productSlug || raw.productId || idx}`,
          },
          { status: 400 }
        );
      }

      const stock = Number(productRow.stock ?? 0);
      if (stock < qty) {
        return NextResponse.json(
          {
            error: `Недостатньо на складі: ${productRow.name_uk} (є ${stock}, потрібно ${qty})`,
            productId: productRow.id,
            available: stock,
          },
          { status: 409 }
        );
      }

      // SERVER PRICE — ignore client raw.price
      const unitPrice = Number(productRow.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: "Invalid product price in database" },
          { status: 500 }
        );
      }

      subtotal += unitPrice * qty;
      safeItems.push({
        id: `tmp-${idx}`,
        productId: String(productRow.id),
        productName: String(productRow.name_uk),
        productSlug: String(productRow.slug),
        price: unitPrice,
        quantity: qty,
      });
    }

    const delivery = Math.max(0, Number(deliveryCost) || 0);
    const total = subtotal + delivery;
    const orderNumber = generateOrderNumber();
    const paymentStatus =
      paymentMethod === "cod" ? "pending" : "awaiting_payment";

    // Atomic stock decrement for all lines
    const decremented: { id: string; qty: number }[] = [];

    const decrementStock = async (
      productId: string,
      qty: number
    ): Promise<boolean> => {
      const { data: ok, error } = await supabase.rpc(
        "decrement_product_stock",
        { p_product_id: productId, p_qty: qty }
      );
      if (!error && ok === true) return true;

      // Fallback if RPC not migrated yet
      const { data: cur } = await supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .maybeSingle();
      const curStock = Number(cur?.stock ?? 0);
      if (curStock < qty) return false;
      const { data: updated, error: setErr } = await supabase
        .from("products")
        .update({ stock: curStock - qty, updated_at: new Date().toISOString() })
        .eq("id", productId)
        .gte("stock", qty)
        .select("id");
      return !setErr && Boolean(updated?.length);
    };

    try {
      for (const line of safeItems) {
        const ok = await decrementStock(line.productId!, line.quantity);
        if (!ok) {
          throw new Error(
            `Не вдалося списати склад: ${line.productName}`
          );
        }
        decremented.push({ id: line.productId!, qty: line.quantity });
      }
    } catch (stockErr) {
      // compensate
      for (const d of decremented) {
        const { data: cur } = await supabase
          .from("products")
          .select("stock")
          .eq("id", d.id)
          .maybeSingle();
        if (cur) {
          await supabase
            .from("products")
            .update({ stock: Number(cur.stock) + d.qty })
            .eq("id", d.id);
        }
      }
      console.error("[orders] stock error", stockErr);
      return NextResponse.json(
        {
          error:
            stockErr instanceof Error
              ? stockErr.message
              : "Stock update failed",
        },
        { status: 409 }
      );
    }

    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        status: "new",
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        delivery_method: "nova_poshta",
        delivery_carrier: "nova_poshta",
        np_city_ref: npCityRef || null,
        np_city_name: npCityName || null,
        np_warehouse_ref: npWarehouseRef || null,
        np_warehouse_name: npWarehouseName || null,
        delivery_cost: delivery,
        subtotal,
        total,
        comment: comment || null,
      })
      .select("id, created_at")
      .single();

    if (orderErr || !orderRow) {
      // compensate stock
      for (const d of decremented) {
        const { data: cur } = await supabase
          .from("products")
          .select("stock")
          .eq("id", d.id)
          .maybeSingle();
        if (cur) {
          await supabase
            .from("products")
            .update({ stock: Number(cur.stock) + d.qty })
            .eq("id", d.id);
        }
      }
      console.error("[orders] insert error", orderErr);
      return NextResponse.json(
        { error: orderErr?.message || "Failed to create order" },
        { status: 500 }
      );
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      safeItems.map((i) => ({
        order_id: orderRow.id,
        product_id: i.productId,
        product_name: i.productName,
        product_slug: i.productSlug,
        price: i.price,
        quantity: i.quantity,
      }))
    );

    if (itemsErr) {
      console.error("[orders] items error", itemsErr);
    }

    const order: Order = {
      id: orderRow.id,
      orderNumber,
      status: "new",
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      paymentMethod: paymentMethod as PaymentMethod,
      paymentStatus,
      deliveryMethod: "nova_poshta",
      npCityRef: npCityRef || null,
      npCityName: npCityName || null,
      npWarehouseRef: npWarehouseRef || null,
      npWarehouseName: npWarehouseName || null,
      deliveryCost: delivery,
      subtotal,
      total,
      comment: comment || null,
      createdAt: orderRow.created_at || new Date().toISOString(),
      items: safeItems.map((i, idx) => ({
        ...i,
        id: `oi-${orderNumber}-${idx}`,
      })),
    };

    await sendOrderToTelegram(order);

    return NextResponse.json({
      ok: true,
      orderNumber,
      orderId: order.id,
      subtotal,
      total,
      items: safeItems.map((i) => ({
        productId: i.productId,
        name: i.productName,
        price: i.price,
        quantity: i.quantity,
      })),
      paymentUrl: createPaymentUrl(order, paymentMethod as PaymentMethod),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use /api/admin/orders" },
    { status: 403 }
  );
}
