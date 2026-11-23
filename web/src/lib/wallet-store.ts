"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBrowserSupabase } from "./supabase/client";

export interface WalletTx {
  id: string;
  kind: "deposit" | "withdrawal" | "game_entry" | "game_win" | "bonus" | "refund";
  amountCents: number;
  description: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface WalletState {
  balanceCents: number;
  pendingCents: number;
  transactions: WalletTx[];
  phone: string;
  /** Guest wallet = local demo credits. Signed in = server ledger. */
  mode: "guest" | "remote";
  setPhone: (phone: string) => void;
  credit: (amountCents: number, kind: WalletTx["kind"], description: string) => void;
  debit: (amountCents: number, kind: WalletTx["kind"], description: string) => boolean;
  addDemoCredits: (amountCents?: number) => void;
  syncFromServer: () => Promise<void>;
  reset: () => void;
}

const DEMO_START = 50_000; // KES 500 of play money for the guest demo

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      balanceCents: 0,
      pendingCents: 0,
      transactions: [],
      phone: "",
      mode: "guest",

      setPhone: (phone) => set({ phone }),

      credit: (amountCents, kind, description) =>
        set((s) => ({
          balanceCents: s.balanceCents + amountCents,
          transactions: [
            {
              id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              kind,
              amountCents,
              description,
              status: "completed" as const,
              createdAt: new Date().toISOString(),
            },
            ...s.transactions,
          ].slice(0, 60),
        })),

      debit: (amountCents, kind, description) => {
        const { balanceCents } = get();
        if (amountCents > balanceCents) return false;
        set((s) => ({
          balanceCents: s.balanceCents - amountCents,
          transactions: [
            {
              id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              kind,
              amountCents: -amountCents,
              description,
              status: "completed" as const,
              createdAt: new Date().toISOString(),
            },
            ...s.transactions,
          ].slice(0, 60),
        }));
        return true;
      },

      addDemoCredits: (amountCents = DEMO_START) =>
        get().credit(amountCents, "bonus", "Demo credits (play money)"),

      syncFromServer: async () => {
        const supabase = getBrowserSupabase();
        if (!supabase) return;
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;

        const [{ data: wallet }, { data: txs }] = await Promise.all([
          supabase.from("wallets").select("balance_cents,pending_cents").eq("user_id", auth.user.id).maybeSingle(),
          supabase
            .from("wallet_transactions")
            .select("id,kind,amount_cents,status,description,created_at")
            .order("created_at", { ascending: false })
            .limit(40),
        ]);

        set({
          mode: "remote",
          balanceCents: wallet?.balance_cents ?? 0,
          pendingCents: wallet?.pending_cents ?? 0,
          transactions: (txs ?? []).map((t) => ({
            id: t.id,
            kind: t.kind as WalletTx["kind"],
            amountCents: t.amount_cents,
            status: t.status as WalletTx["status"],
            description: t.description,
            createdAt: t.created_at,
          })),
        });
      },

      reset: () => set({ balanceCents: 0, pendingCents: 0, transactions: [], mode: "guest" }),
    }),
    { name: "ludo-wallet-v2" },
  ),
);

export const kes = (cents: number) =>
  `KES ${(cents / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
