"use server";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

export interface ProfileSummary {
  id: string;
  username: string;
  avatar_emoji: string;
  rating: number;
  matches_played: number;
  matches_won: number;
  bonus_streak: number;
  last_bonus_at: string | null;
  balance_cents: number;
}

/** Resolve the signed-in user from the access token the browser sends. */
async function currentUser(accessToken: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.auth.getUser(accessToken);
  return data.user ?? null;
}

/** Returns the caller's profile, or null for guests / unconfigured installs. */
export async function getMyProfile(accessToken: string): Promise<ProfileSummary | null> {
  const user = await currentUser(accessToken);
  if (!user) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: profile }, { data: wallet }] = await Promise.all([
    supabase.from("ludo_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("ludo_wallets").select("balance_cents").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    avatar_emoji: profile.avatar_emoji,
    rating: profile.rating,
    matches_played: profile.matches_played,
    matches_won: profile.matches_won,
    bonus_streak: profile.bonus_streak,
    last_bonus_at: profile.last_bonus_at,
    balance_cents: wallet?.balance_cents ?? 0,
  };
}
