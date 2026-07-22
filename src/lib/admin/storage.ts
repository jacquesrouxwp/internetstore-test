/**
 * Product image helpers for admin.
 * - With Supabase service role: upload to Storage bucket product-images
 * - Without: keep remote URLs or accept already-hosted paths
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "product-images";

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

export function publicStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Upload a File/Blob to Supabase Storage. Returns public URL or null on failure.
 */
export async function uploadProductImage(
  file: Blob,
  filename: string,
  productKey?: string
): Promise<string | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  try {
    await ensureProductImagesBucket(supabase);
  } catch {
    // bucket may already exist or creation blocked — continue
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

/**
 * Download image from external URL and store in Supabase Storage.
 * Falls back to original URL if Storage is unavailable.
 */
export async function mirrorImageToStorage(
  imageUrl: string,
  productKey: string,
  index: number
): Promise<string> {
  if (!imageUrl || imageUrl.startsWith("/")) return imageUrl;

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
