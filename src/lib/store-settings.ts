/**
 * Store settings — key/value in store_settings table.
 * Server: service_role. Public read via RLS for non-secret keys.
 */
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export type SiteSettings = {
  phones: string[];
  email: string;
  address: string;
  hours: string;
  siteName: string;
};

export type SocialSettings = {
  telegram: string;
  viber: string;
  whatsapp: string;
};

export type LegalSettings = {
  entityName: string;
  edrpou: string;
  ipn: string;
  legalAddress: string;
};

export type DeliverySettings = {
  defaultCost: number;
  freeFrom: number;
  note: string;
};

export type NpSenderSettings = {
  cityRef: string;
  cityName: string;
  senderRef: string;
  senderAddressRef: string;
  contactSender: string;
  sendersPhone: string;
  warehouseRef: string;
};

export type NotifyTemplates = Record<string, string>;

export type InventorySettings = {
  lowStockThreshold: number;
};

export type SecuritySettings = {
  passwordHash: string | null;
  adminEmail: string | null;
};

const DEFAULTS: Record<string, unknown> = {
  site: {
    phones: ["+38 068 692-86-75"],
    email: "info@pro-optics.ua",
    address: "Київ, Україна",
    hours: "Пн–Пт: 9:00–18:00 · Сб: 12:00–15:00",
    siteName: "Pro-Optics",
  } satisfies SiteSettings,
  social: {
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/pro_optics_ua",
    viber:
      process.env.NEXT_PUBLIC_VIBER_URL ||
      "viber://chat?number=%2B380501112233",
    whatsapp:
      process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/380501112233",
  } satisfies SocialSettings,
  legal: {
    entityName: "",
    edrpou: "",
    ipn: "",
    legalAddress: "",
  } satisfies LegalSettings,
  delivery: {
    defaultCost: 0,
    freeFrom: 0,
    note: "Доставка Новою Поштою",
  } satisfies DeliverySettings,
  nova_poshta_sender: {
    cityRef: "",
    cityName: "",
    senderRef: "",
    senderAddressRef: "",
    contactSender: "",
    sendersPhone: "",
    warehouseRef: "",
  } satisfies NpSenderSettings,
  notify_templates: {
    new: "Ваше замовлення {orderNumber} прийнято. Дякуємо!",
    processing: "Замовлення {orderNumber} в обробці.",
    shipped: "Замовлення {orderNumber} відправлено. ТТН: {trackingNumber}",
    done: "Замовлення {orderNumber} виконано. Дякуємо за покупку!",
    cancelled: "Замовлення {orderNumber} скасовано.",
    returned: "Замовлення {orderNumber} оформлено як повернення.",
  },
  inventory: { lowStockThreshold: 2 } satisfies InventorySettings,
  security: { passwordHash: null, adminEmail: null } satisfies SecuritySettings,
};

async function readKeyPublic(key: string): Promise<unknown | null> {
  try {
    if (hasServiceSupabase()) {
      const sb = createServiceClient();
      const { data } = await sb
        .from("store_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value ?? null;
    }
    const sb = await createClient();
    if (!sb) return null;
    const { data } = await sb
      .from("store_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

export async function getSetting<T>(key: string): Promise<T> {
  const raw = await readKeyPublic(key);
  const fallback = DEFAULTS[key] as T;
  if (raw == null) return fallback;
  if (typeof raw === "object" && !Array.isArray(raw) && fallback && typeof fallback === "object") {
    return { ...(fallback as object), ...(raw as object) } as T;
  }
  return raw as T;
}

export async function getAllPublicSettings() {
  const [site, social, legal, delivery, inventory] = await Promise.all([
    getSetting<SiteSettings>("site"),
    getSetting<SocialSettings>("social"),
    getSetting<LegalSettings>("legal"),
    getSetting<DeliverySettings>("delivery"),
    getSetting<InventorySettings>("inventory"),
  ]);
  return { site, social, legal, delivery, inventory };
}

/** Admin: all keys including secrets-ish (password hash never sent to client raw without care) */
export async function adminGetAllSettings(): Promise<Record<string, unknown>> {
  if (!hasServiceSupabase()) {
    return { ...DEFAULTS };
  }
  const sb = createServiceClient();
  const { data, error } = await sb.from("store_settings").select("key, value");
  if (error) throw error;
  const out: Record<string, unknown> = { ...DEFAULTS };
  for (const row of data || []) {
    const k = String(row.key);
    const v = row.value;
    if (v && typeof v === "object" && out[k] && typeof out[k] === "object") {
      out[k] = { ...(out[k] as object), ...(v as object) };
    } else {
      out[k] = v;
    }
  }
  // Never expose hash to UI list — only flag
  const sec = out.security as SecuritySettings;
  if (sec) {
    out.security = {
      adminEmail: sec.adminEmail,
      hasPassword: Boolean(sec.passwordHash),
    };
  }
  return out;
}

export async function adminSetSetting(
  key: string,
  value: unknown
): Promise<void> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const sb = createServiceClient();
  const { error } = await sb.from("store_settings").upsert(
    {
      key,
      value: value as object,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw error;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (!hasServiceSupabase()) {
    return DEFAULTS.security as SecuritySettings;
  }
  const sb = createServiceClient();
  const { data } = await sb
    .from("store_settings")
    .select("value")
    .eq("key", "security")
    .maybeSingle();
  const v = (data?.value || {}) as SecuritySettings;
  return {
    passwordHash: v.passwordHash ?? null,
    adminEmail: v.adminEmail ?? null,
  };
}

export function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), v || "");
  }
  return s;
}
