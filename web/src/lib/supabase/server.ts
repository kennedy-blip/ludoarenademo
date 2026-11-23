import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured, serviceRoleKey } from "./config";

/** Server-only privileged client. Never import from a client component. */
export function getAdminSupabase(): SupabaseClient | null {
  const key = serviceRoleKey();
  if (!isSupabaseConfigured() || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
