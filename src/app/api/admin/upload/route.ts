import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { uploadProductImage } from "@/lib/admin/storage";
import { hasServiceSupabase } from "@/lib/supabase/service";

/**
 * Upload product images to Supabase Storage (no data-URL fallback).
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      {
        error:
          "Supabase Storage requires SUPABASE_SERVICE_ROLE_KEY. Configure env and create bucket product-images.",
      },
      { status: 503 }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const productKey = String(form.get("productKey") || "uploads");
  const files = form
    .getAll("files")
    .filter(
      (f): f is File =>
        typeof f === "object" && f !== null && "arrayBuffer" in f
    );

  const single = form.get("file");
  if (single && typeof single === "object" && "arrayBuffer" in single) {
    files.push(single as File);
  }

  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const urls: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const name = file.name || "image.jpg";
    const uploaded = await uploadProductImage(file, name, productKey);
    if (uploaded) urls.push(uploaded);
    else failed.push(name);
  }

  if (!urls.length) {
    return NextResponse.json(
      {
        error: "Upload failed — check Storage bucket product-images",
        failed,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    urls,
    count: urls.length,
    failed,
    storage: "supabase",
  });
}
