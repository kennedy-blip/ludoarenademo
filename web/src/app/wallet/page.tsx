"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Pill, SectionTitle, Stat } from "@/components/ui";
import { ENTRY_FEES, MIN_DEPOSIT, MIN_WITHDRAWAL, prizePoolFor } from "@/lib/economy";
import { formatKenyanPhone, validateKenyanPhone } from "@/lib/mpesa";
import { kes, useWallet } from "@/lib/wallet-store";
import { cn } from "@/lib/cn";

type Tab = "deposit" | "withdraw" | "history";

export default function WalletPage() {
  const wallet = useWallet();
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(wallet.phone);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const amountNum = Number(amount);
  const validPhone = validateKenyanPhone(phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validPhone) {
      setMessage({ tone: "err", text: "Enter a valid Safaricom number (07XX XXX XXX or 2547XXXXXXXX)." });
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum < (tab === "deposit" ? MIN_DEPOSIT : MIN_WITHDRAWAL)) {
      setMessage({
        tone: "err",
        text: `Minimum ${tab === "deposit" ? "deposit" : "withdrawal"} is KES ${
          tab === "deposit" ? MIN_DEPOSIT : MIN_WITHDRAWAL
        }.`,
      });
      return;
    }

    setBusy(true);
    try {
      if (tab === "deposit") {
        // Demo settlement: real STK push happens in the M-Pesa edge function
        // once Daraja credentials are configured.
        await new Promise((r) => setTimeout(r, 900));
        wallet.credit(amountNum * 100, "deposit", `M-Pesa deposit · ${formatKenyanPhone(phone)}`);
        setMessage({ tone: "ok", text: `KES ${amountNum} added to your demo wallet.` });
      } else {
        if (amountNum * 100 > wallet.balanceCents) {
          setMessage({ tone: "err", text: "Amount exceeds your balance." });
          return;
        }
        await new Promise((r) => setTimeout(r, 900));
        wallet.debit(amountNum * 100, "withdrawal", `M-Pesa payout · ${formatKenyanPhone(phone)}`);
        setMessage({ tone: "ok", text: `KES ${amountNum} queued for B2C payout (demo).` });
      }
      wallet.setPhone(phone);
      setAmount("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="arena-shell">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/55 hover:text-white">
            ← Arena
          </Link>
          <Pill tone={wallet.mode === "remote" ? "green" : "default"}>
            {wallet.mode === "remote" ? "● linked account" : "demo wallet"}
          </Pill>
        </div>

        <Card className="mt-5 overflow-hidden border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 to-teal-600/10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Available balance</div>
          <div className="mt-1 text-4xl font-black tabular-nums text-white">{kes(wallet.balanceCents)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Pending" value={kes(wallet.pendingCents)} hint="awaiting M-Pesa" />
            <Stat
              label="Beast pool at KES 250"
              value={kes(prizePoolFor(250, 4) * 100)}
              hint="4 players · 90% payout"
              accent="text-amber-300"
            />
          </div>
        </Card>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
          <Card>
            <div className="mb-3 flex rounded-xl bg-white/5 p-1">
              {(["deposit", "withdraw", "history"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold capitalize transition",
                    tab === t ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80",
                  )}
                >
                  {t === "deposit" ? "📥" : t === "withdraw" ? "📤" : "📋"} {t}
                </button>
              ))}
            </div>

            {tab === "history" ? (
              <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
                {wallet.transactions.length === 0 && (
                  <p className="py-8 text-center text-sm text-white/35">No transactions yet.</p>
                )}
                {wallet.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-white/80">{tx.description}</div>
                      <div className="text-[10px] text-white/35">
                        {new Date(tx.createdAt).toLocaleString("en-KE", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        tx.amountCents >= 0 ? "text-emerald-300" : "text-rose-300",
                      )}
                    >
                      {tx.amountCents >= 0 ? "+" : ""}
                      {kes(Math.abs(tx.amountCents))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-white/40">M-Pesa number</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="0712 345 678"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-400/60 focus:outline-none"
                  />
                  {phone.length > 0 && (
                    <span className={cn("mt-1 block text-[11px]", validPhone ? "text-emerald-300" : "text-rose-300")}>
                      {validPhone ? `✓ ${formatKenyanPhone(phone)}` : "Safaricom numbers only"}
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-white/40">
                    Amount ({kes(0).split(" ")[0]})
                  </span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder={tab === "deposit" ? "500" : "250"}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-lg font-bold tabular-nums text-white placeholder:text-white/25 focus:border-violet-400/60 focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {[100, 250, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10"
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {message && (
                  <p className={cn("text-[12px]", message.tone === "ok" ? "text-emerald-300" : "text-rose-300")}>
                    {message.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full rounded-xl py-3 text-sm font-bold text-white"
                >
                  {busy
                    ? "Contacting M-Pesa…"
                    : tab === "deposit"
                      ? "Deposit via M-Pesa"
                      : "Withdraw to M-Pesa"}
                </button>
                <p className="text-center text-[10px] leading-relaxed text-white/30">
                  Demo mode · no real money moves until Daraja keys are configured.
                </p>
              </form>
            )}
          </Card>

          <div className="space-y-3">
            <Card>
              <SectionTitle eyebrow="Top up fast" title="Entry fees" />
              <div className="grid grid-cols-2 gap-1.5">
                {ENTRY_FEES.map((fee) => (
                  <div key={fee} className="rounded-xl bg-white/[0.04] px-2.5 py-2">
                    <div className="text-[11px] text-white/40">Entry</div>
                    <div className="text-sm font-bold text-white">KES {fee}</div>
                    <div className="text-[10px] text-amber-300/80">win {kes(prizePoolFor(fee, 4) * 100)}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="text-sm font-bold text-white">Play-money top-up</div>
              <p className="mt-1 text-[11px] text-white/45">
                Add demo credits to test Beast Mode without a phone.
              </p>
              <button
                onClick={() => wallet.addDemoCredits()}
                className="mt-3 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-400/20"
              >
                + KES 500 demo credits
              </button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
