import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service_role.
 * Bypasses RLS — never import from client components.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function hasPublicSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function supabaseEnvStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return {
    urlPresent: Boolean(url),
    anonPresent: Boolean(anon),
    servicePresent: Boolean(service),
    urlHost: url ? url.replace(/^https?:\/\//, "").split("/")[0] : null,
  };
}
