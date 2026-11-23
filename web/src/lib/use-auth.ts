"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { getMyProfile, type ProfileSummary } from "@/app/actions/profile";

export interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: ProfileSummary | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    setUser(session?.user ?? null);
    setToken(session?.access_token ?? null);
    if (session) {
      const p = await getMyProfile(session.access_token);
      setProfile(p);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Accounts need Supabase credentials configured.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Accounts need Supabase credentials configured.";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setToken(null);
  }, []);

  return {
    configured: isSupabaseConfigured(),
    loading,
    user,
    profile,
    token,
    signIn,
    signUp,
    signOut,
    refresh: load,
  };
}
