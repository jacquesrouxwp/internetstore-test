import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminGetAllSettings,
  adminSetSetting,
  getSecuritySettings,
} from "@/lib/store-settings";
import bcrypt from "bcryptjs";

const ALLOWED_KEYS = new Set([
  "site",
  "social",
  "legal",
  "delivery",
  "nova_poshta_sender",
  "notify_templates",
  "inventory",
]);

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  try {
    if (!hasServiceSupabase()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const settings = await adminGetAllSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const key = String(body.key || "");
    const value = body.value;

    // Password change
    if (key === "password") {
      const current = String(body.currentPassword || "");
      const next = String(body.newPassword || "");
      if (next.length < 8) {
        return NextResponse.json(
          { error: "Новий пароль мінімум 8 символів" },
          { status: 400 }
        );
      }
      const sec = await getSecuritySettings();
      const demoPass = process.env.ADMIN_PASSWORD || "admin123";
      const demoEmail = process.env.ADMIN_EMAIL || "admin@pro-optics.ua";

      let currentOk = false;
      if (sec.passwordHash) {
        currentOk = await bcrypt.compare(current, sec.passwordHash);
      } else {
        currentOk = current === demoPass;
      }
      if (!currentOk) {
        return NextResponse.json(
          { error: "Поточний пароль невірний" },
          { status: 401 }
        );
      }

      const hash = await bcrypt.hash(next, 12);
      await adminSetSetting("security", {
        passwordHash: hash,
        adminEmail: sec.adminEmail || demoEmail,
      });
      return NextResponse.json({ ok: true, passwordChanged: true });
    }

    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "Unknown key" }, { status: 400 });
    }
    if (value == null || typeof value !== "object") {
      return NextResponse.json(
        { error: "value object required" },
        { status: 400 }
      );
    }

    await adminSetSetting(key, value);
    return NextResponse.json({ ok: true, key });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
