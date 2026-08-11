import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  clearAdminCookie,
  getDemoCredentials,
  isAdminUser,
  isSupabaseAuthConfigured,
  setAdminCookie,
} from "@/lib/admin/auth";
import { clientIp, rateLimit } from "@/lib/admin/rate-limit";
import { getSecuritySettings } from "@/lib/store-settings";
import { hasServiceSupabase } from "@/lib/supabase/service";

function serverSecretError() {
  return NextResponse.json(
    {
      error:
        "Сервер не налаштований: задайте ADMIN_SESSION_SECRET (або ADMIN_PASSWORD).",
    },
    { status: 500 }
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // Per-IP + global soft caps (serverless: best-effort per instance)
  const rlIp = rateLimit(`admin-login:ip:${ip}`, 5, 15 * 60 * 1000);
  const rlGlobal = rateLimit(`admin-login:global`, 40, 15 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      {
        error: `Забагато спроб. Спробуйте через ${rlIp.retryAfterSec} с.`,
      },
      { status: 429 }
    );
  }
  if (!rlGlobal.ok) {
    return NextResponse.json(
      {
        error: `Забагато спроб. Спробуйте через ${rlGlobal.retryAfterSec} с.`,
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().slice(0, 200);
  const password = String(body.password || "").slice(0, 200);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Вкажіть email і пароль" },
      { status: 400 }
    );
  }

  // Extra throttle per email (brute force on one account)
  const rlEmail = rateLimit(
    `admin-login:email:${email.toLowerCase()}`,
    8,
    15 * 60 * 1000
  );
  if (!rlEmail.ok) {
    return NextResponse.json(
      {
        error: `Забагато спроб. Спробуйте через ${rlEmail.retryAfterSec} с.`,
      },
      { status: 429 }
    );
  }

  // 1) DB password hash (after first change in settings)
  if (hasServiceSupabase()) {
    try {
      const sec = await getSecuritySettings();
      if (sec.passwordHash) {
        const emailOk =
          !sec.adminEmail ||
          email.toLowerCase() === sec.adminEmail.toLowerCase() ||
          email.toLowerCase() ===
            (process.env.ADMIN_EMAIL || "admin@pro-optics.ua").toLowerCase();
        if (emailOk && (await bcrypt.compare(password, sec.passwordHash))) {
          const res = NextResponse.json({
            ok: true,
            mode: "db-hash",
            email,
          });
          if (!(await setAdminCookie(res))) return serverSecretError();
          return res;
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 2) Supabase Auth when configured
  if (isSupabaseAuthConfigured()) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user && data.session) {
        if (!isAdminUser(data.user)) {
          await supabase.auth.signOut();
          return NextResponse.json(
            {
              error:
                "Доступ заборонено. Цей акаунт не має ролі admin.",
            },
            { status: 403 }
          );
        }

        const res = NextResponse.json({
          ok: true,
          mode: "supabase",
          email: data.user.email,
        });
        if (!(await setAdminCookie(res))) return serverSecretError();
        res.cookies.set("sb-admin-access", data.session.access_token, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: data.session.expires_in || 3600,
        });
        return res;
      }
    } catch {
      /* fall through */
    }
  }

  // 3) Env credentials (bootstrap / recovery) — disabled in prod without ADMIN_PASSWORD
  const demo = getDemoCredentials();
  if (demo && email === demo.email && password === demo.password) {
    const res = NextResponse.json({
      ok: true,
      mode: "env",
      email: demo.email,
    });
    if (!(await setAdminCookie(res))) return serverSecretError();
    return res;
  }

  return NextResponse.json(
    { error: "Невірний email або пароль" },
    { status: 401 }
  );
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  res.cookies.set("sb-admin-access", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const { hasAdminCookie } = await import("@/lib/admin/auth");
  if (!(await hasAdminCookie(req))) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    mode: isSupabaseAuthConfigured() ? "supabase" : "demo",
  });
}
