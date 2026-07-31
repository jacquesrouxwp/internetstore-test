import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import { adminGetOrder, adminPatchOrder } from "@/lib/db/admin-repo";
import {
  createInternetDocument,
  hasNovaPoshtaKey,
  npTrackingUrl,
} from "@/lib/nova-poshta";
import { getSetting, type NpSenderSettings } from "@/lib/store-settings";
import { notifyCustomerStatus } from "@/lib/notify-customer";

/**
 * POST { orderId } — create Nova Poshta ТТН for order
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  if (!hasServiceSupabase()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  if (!hasNovaPoshtaKey()) {
    return NextResponse.json(
      {
        error: "NOVA_POSHTA_API_KEY не задано",
        hint: "Додайте ключ у Vercel env і реквізити відправника в /admin/settings",
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const orderId = String(body.orderId || "");
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const order = await adminGetOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!order.npCityRef || !order.npWarehouseRef) {
      return NextResponse.json(
        { error: "У замовленні немає міста/відділення НП" },
        { status: 400 }
      );
    }

    const sender = await getSetting<NpSenderSettings>("nova_poshta_sender");
    // env overrides empty settings
    const citySender =
      sender.cityRef || process.env.NOVA_POSHTA_SENDER_CITY_REF || "";
    const senderRef =
      sender.senderRef || process.env.NOVA_POSHTA_SENDER_REF || "";
    const senderAddress =
      sender.senderAddressRef ||
      process.env.NOVA_POSHTA_SENDER_ADDRESS_REF ||
      "";
    const contactSender =
      sender.contactSender || process.env.NOVA_POSHTA_CONTACT_SENDER || "";
    const sendersPhone =
      sender.sendersPhone || process.env.NOVA_POSHTA_SENDERS_PHONE || "";

    const result = await createInternetDocument({
      citySender,
      sender: senderRef,
      senderAddress,
      contactSender,
      sendersPhone,
      cityRecipient: order.npCityRef,
      recipient: "",
      recipientAddress: order.npWarehouseRef,
      contactRecipient: order.customerName,
      recipientsPhone: order.customerPhone,
      cost: order.subtotal,
      description: `Замовлення ${order.orderNumber}`,
      weight: "1",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const trackingUrl = npTrackingUrl(result.intDocNumber);
    let updated = await adminPatchOrder(orderId, {
      trackingNumber: result.intDocNumber,
      trackingUrl,
      status: order.status === "new" || order.status === "processing"
        ? "shipped"
        : undefined,
    });

    if (updated && body.notify !== false) {
      await notifyCustomerStatus(updated, updated.status);
      updated = await adminPatchOrder(orderId, {
        statusNotifiedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      ttn: result.intDocNumber,
      trackingUrl,
      order: updated,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TTN failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ready: hasNovaPoshtaKey(),
    hint: hasNovaPoshtaKey()
      ? "API key set — fill sender refs in settings"
      : "Set NOVA_POSHTA_API_KEY",
  });
}
