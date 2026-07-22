import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminCookie,
  getDemoCredentials,
  isAdminUser,
  isSupabaseAuthConfigured,
  setAdminCookie,
} from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Вкажіть email і пароль" },
      { status: 400 }
    );
  }

  // Prefer Supabase Auth when configured
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
                "Доступ заборонено. Цей акаунт не має ролі admin. Покупці не можуть увійти в кабінет.",
            },
            { status: 403 }
          );
        }

        const res = NextResponse.json({
          ok: true,
          mode: "supabase",
          email: data.user.email,
        });
        setAdminCookie(res);
        // Also set supabase access token cookie for SSR clients if needed
        res.cookies.set("sb-admin-access", data.session.access_token, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: data.session.expires_in || 3600,
        });
        return res;
      }

      // If Supabase rejects, fall through to demo only when emails match demo
    } catch {
      // fall through
    }
  }

  // Demo / env credentials (owner without Supabase yet)
  const demo = getDemoCredentials();
  if (email === demo.email && password === demo.password) {
    const res = NextResponse.json({
      ok: true,
      mode: "demo",
      email: demo.email,
    });
    setAdminCookie(res);
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

/** Session check */
export async function GET(req: NextRequest) {
  const { hasAdminCookie } = await import("@/lib/admin/auth");
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    mode: isSupabaseAuthConfigured() ? "supabase" : "demo",
  });
}
