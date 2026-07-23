/**
 * Product image helpers — Supabase Storage bucket product-images.
 * Server-only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";

const BUCKET = "product-images";

export function getServiceSupabase(): SupabaseClient | null {
  if (!hasServiceSupabase()) return null;
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export async function ensureProductImagesBucket(
  supabase: SupabaseClient
): Promise<void> {
  const { data } = await supabase.storage.listBuckets();
  if (data?.some((b) => b.name === BUCKET)) return;
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
}

/**
 * Upload File/Blob to Storage. Returns public URL or null.
 * No data-URL fallback for production reliability.
 */
export async function uploadProductImage(
  file: Blob,
  filename: string,
  productKey?: string
): Promise<string | null> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("[storage] service role not configured");
    return null;
  }

  try {
    await ensureProductImagesBucket(supabase);
  } catch {
    /* bucket may exist */
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const folder = productKey || "uploads";
  const path = `${folder}/${Date.now()}-${safe}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (error) {
    console.error("Storage upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function mirrorImageToStorage(
  imageUrl: string,
  productKey: string,
  index: number
): Promise<string> {
  if (!imageUrl || imageUrl.startsWith("/")) return imageUrl;
  if (imageUrl.includes("/storage/v1/object/public/product-images/")) {
    return imageUrl;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Pro-Optics-Importer/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return imageUrl;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const buf = await res.arrayBuffer();
    const blob = new Blob([buf], { type: contentType });
    const uploaded = await uploadProductImage(
      blob,
      `img-${index}.${ext}`,
      productKey
    );
    return uploaded || imageUrl;
  } catch (e) {
    console.error("mirrorImageToStorage failed:", e);
    return imageUrl;
  }
}
