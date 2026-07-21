import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "");
  const password = String(body.password || "");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@opticsshop.ua";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  // Prefer Supabase Auth when configured
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.session) {
        const res = NextResponse.json({ ok: true, mode: "supabase" });
        res.cookies.set("optics_admin", "1", {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
        return res;
      }
    } catch {
      // fall through to demo auth
    }
  }

  if (email === adminEmail && password === adminPassword) {
    const res = NextResponse.json({ ok: true, mode: "demo" });
    res.cookies.set("optics_admin", "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("optics_admin", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
