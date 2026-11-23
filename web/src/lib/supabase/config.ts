/** Supabase wiring that degrades gracefully.
 *
 *  The public demo on Render/Vercel must keep working with zero env vars, so
 *  every helper here returns null instead of throwing when configuration is
 *  missing. Callers fall back to guest mode + local storage. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function serviceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export const OAUTH_ENABLED = isSupabaseConfigured();
