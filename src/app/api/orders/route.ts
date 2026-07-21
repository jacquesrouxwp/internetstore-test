import { NextRequest, NextResponse } from "next/server";
import { generateOrderNumber } from "@/lib/utils";
import { addRuntimeOrder } from "@/data/seed";
import type { Order, OrderItem, PaymentMethod } from "@/types";

async function notifyOwner(order: Order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    const text = [
      `🛒 Нове замовлення ${order.orderNumber}`,
      `👤 ${order.customerName}`,
      `📞 ${order.customerPhone}`,
      order.customerEmail ? `✉️ ${order.customerEmail}` : "",
      `💰 ${order.total} грн`,
      order.npCityName ? `📦 ${order.npCityName}` : "",
      order.npWarehouseName ? `   ${order.npWarehouseName}` : "",
      `💳 ${order.paymentMethod}`,
    ]
      .filter(Boolean)
      .join("\n");

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => null);
  }
}

function createPaymentUrl(
  order: Order,
  method: PaymentMethod
): string | null {
  if (method === "cod") return null;

  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Stubs — real integration needs merchant credentials
  if (method === "monobank" && process.env.MONOBANK_TOKEN) {
    // Would call https://api.monobank.ua/api/merchant/invoice/create
    return `${site}/checkout?pending=${order.orderNumber}&provider=monobank`;
  }
  if (method === "liqpay" && process.env.LIQPAY_PUBLIC_KEY) {
    return `${site}/checkout?pending=${order.orderNumber}&provider=liqpay`;
  }
  if (method === "wayforpay" && process.env.WAYFORPAY_MERCHANT_ACCOUNT) {
    return `${site}/checkout?pending=${order.orderNumber}&provider=wayforpay`;
  }

  // Demo: treat online as COD when keys missing
  return null;
}

export async function POST(req: NextRequest) {
  try {
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
    } = body;

    if (!customerName || !customerPhone || !items.length) {
      return NextResponse.json(
        { error: "Name, phone and items are required" },
        { status: 400 }
      );
    }

    const subtotal = items.reduce(
      (s: number, i: { price: number; quantity: number }) =>
        s + Number(i.price) * Number(i.quantity),
      0
    );
    const total = subtotal + Number(deliveryCost || 0);
    const orderNumber = generateOrderNumber();

    const orderItems: OrderItem[] = items.map(
      (
        i: {
          productId?: string;
          productName: string;
          productSlug?: string;
          price: number;
          quantity: number;
        },
        idx: number
      ) => ({
        id: `oi-${orderNumber}-${idx}`,
        productId: i.productId,
        productName: i.productName,
        productSlug: i.productSlug,
        price: Number(i.price),
        quantity: Number(i.quantity),
      })
    );

    const order: Order = {
      id: `ord-${orderNumber}`,
      orderNumber,
      status: "new",
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      paymentMethod: paymentMethod as PaymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "awaiting_payment",
      deliveryMethod: "nova_poshta",
      npCityName: npCityName || null,
      npWarehouseName: npWarehouseName || null,
      deliveryCost: Number(deliveryCost || 0),
      subtotal,
      total,
      comment: comment || null,
      createdAt: new Date().toISOString(),
      items: orderItems,
    };

    // Prefer Supabase if configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, key);
        const { data: row, error } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            status: "new",
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            payment_method: paymentMethod,
            payment_status: order.paymentStatus,
            delivery_method: "nova_poshta",
            np_city_ref: npCityRef || null,
            np_city_name: npCityName || null,
            np_warehouse_ref: npWarehouseRef || null,
            np_warehouse_name: npWarehouseName || null,
            delivery_cost: deliveryCost,
            subtotal,
            total,
            comment: comment || null,
          })
          .select("id")
          .single();

        if (!error && row) {
          await supabase.from("order_items").insert(
            orderItems.map((i) => ({
              order_id: row.id,
              product_id: i.productId || null,
              product_name: i.productName,
              product_slug: i.productSlug || null,
              price: i.price,
              quantity: i.quantity,
            }))
          );
          order.id = row.id;
        } else {
          addRuntimeOrder(order);
        }
      } catch {
        addRuntimeOrder(order);
      }
    } else {
      addRuntimeOrder(order);
    }

    await notifyOwner(order);
    const paymentUrl = createPaymentUrl(order, paymentMethod as PaymentMethod);

    return NextResponse.json({
      ok: true,
      orderNumber,
      orderId: order.id,
      paymentUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const { getRuntimeOrders } = await import("@/data/seed");
  return NextResponse.json({ orders: getRuntimeOrders() });
}
