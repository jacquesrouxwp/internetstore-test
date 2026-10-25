import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { parseModelInput } from "@/lib/olx-store";

/** The owner's buying prices per model: GET list · POST { id?, name, … } save · DELETE ?id= */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ models: [], error: "Supabase not configured" });
  const { data, error } = await createServiceClient().from("olx_models").select("*").order("name");
  if (error) return NextResponse.json({ models: [], error: error.message });
  return NextResponse.json({ models: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const row = parseModelInput(body);
  if (!row) return NextResponse.json({ error: "Потрібна назва моделі" }, { status: 400 });
  if (row.target_price && row.ceiling_price && row.ceiling_price < row.target_price) {
    return NextResponse.json({ error: "Стеля не може бути нижчою за ціль" }, { status: 400 });
  }
  const sb = createServiceClient();
  const now = new Date().toISOString();
  const id = typeof body.id === "string" && body.id ? body.id : null;
  const q = id
    ? sb.from("olx_models").update({ ...row, updated_at: now }).eq("id", id)
    : sb.from("olx_models").insert({ ...row, created_at: now, updated_at: now });
  const { data, error } = await q.select("*").single();
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json({ error: dup ? "Така модель уже є" : error.message }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json({ model: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await createServiceClient().from("olx_models").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
