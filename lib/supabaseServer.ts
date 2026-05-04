import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Prefer SUPABASE_SERVICE_ROLE_KEY for Storage
 * download and inserts from API routes (bypasses RLS).
 */
export function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceKey ?? anonKey;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key.");
  }

  return createClient(url, key);
}
