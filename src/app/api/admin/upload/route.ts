import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { uploadProductImage } from "@/lib/admin/storage";

/**
 * Upload product images.
 * multipart/form-data with field "files" (multiple) and optional "productKey".
 * Returns { urls: string[] }.
 *
 * Without Supabase Storage: stores as data-URL (works for demo; not for production scale).
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const productKey = String(form.get("productKey") || "uploads");
  const files = form.getAll("files").filter(
    (f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f
  );

  // Also accept single "file"
  const single = form.get("file");
  if (single && typeof single === "object" && "arrayBuffer" in single) {
    files.push(single as File);
  }

  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const urls: string[] = [];

  for (const file of files) {
    const name = file.name || "image.jpg";
    const uploaded = await uploadProductImage(file, name, productKey);

    if (uploaded) {
      urls.push(uploaded);
      continue;
    }

    // Demo fallback: data URL (keeps multi-photo UX without Supabase)
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "image/jpeg";
      // Cap demo data-URL size ~1.5MB
      if (buf.length > 1.5 * 1024 * 1024) {
        urls.push("");
        continue;
      }
      urls.push(`data:${mime};base64,${buf.toString("base64")}`);
    } catch {
      // skip
    }
  }

  const valid = urls.filter(Boolean);
  return NextResponse.json({
    urls: valid,
    count: valid.length,
    storage: process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "inline",
  });
}
