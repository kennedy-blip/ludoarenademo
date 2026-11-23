# Stack migration: Vite → Next.js (zero-downtime)

Production today: **https://ludoarenademo-1.onrender.com** — a Render static site
built from `main` with `npm ci && npm run build` → `./dist`.

Nothing in this document changes that until you explicitly flip a switch.

---

## What changed in this branch

| Area | Before | After |
| --- | --- | --- |
| Framework | Vite 7 + React 19, single-file bundle | Next.js 16 (App Router) in `web/` |
| Routing | Single screen, conditional render | Real routes: `/`, `/play`, `/beast`, `/wallet`, `/leaderboard`, `/tournament`, `/account` |
| Game rules | `useGameLogic` hook, mutable state, timers inside React | `web/src/lib/engine/*` — pure, seeded, replayable, **17 unit tests** |
| State | `useState` + `localStorage` | Zustand stores with persistence, server-authoritative verification |
| Money | Fake service, floats in `localStorage` | Integer-cent ledger, Postgres wallet, service-role settlement |
| Identity | None | Supabase Auth, profiles, Elo ratings, ranks |
| Progression | None | Leaderboard, weekly tournament, daily bonus streaks |
| Repo | `node_modules` committed (3,043 files) | Untracked + `.gitignore`, Node 22 pinned |

The original app still lives at the repo root and is **byte-identical in behaviour**;
`npm ci && npm run build` there produces the same `dist/index.html` as before.

---

## Deploy topology

```
render.yaml
├── ludoarenademo   (static, rootDir .)        ← LIVE, untouched build
└── ludo-arena-web  (node,   rootDir web)      ← new app, preview first
```

`previewsEnabled: true` in the blueprint makes Render build an isolated preview
for every pull request, so this branch can be tested end-to-end on a real URL
while production keeps serving `main`.

### Phase 1 — Preview (do this first)

1. Push this branch and open the PR (already done by the agent).
2. In Render → **Blueprints** → apply `render.yaml` (or let the PR preview build run).
3. Set the Supabase env vars on the preview service only:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Test: play a free match, play a Beast match (demo credits), claim the daily bonus,
   check `/leaderboard` and `/tournament`.
5. Production is still serving the Vite build the whole time.

### Phase 2 — Cutover (only when you're happy)

1. Render → `ludo-arena-web` → **Settings → Custom Domains** → add your domain
   (or swap the service that `ludoarenademo-1.onrender.com` routes to).
2. Keep `ludoarenademo` running for one release cycle as a rollback target.
3. Rollback = re-point the domain at the static service. Nothing is deleted.

### Phase 3 — Cleanup

Once the Next app has served production for a release cycle:

```bash
git rm -r src index.html vite.config.ts tsconfig.json postcss.config.js \
           tailwind.config.js package.json package-lock.json
```

The root then only holds `web/`, `docs/`, and `render.yaml`.

---

## Repo hygiene that fixed the Render build

The previous tree committed `node_modules/` with `.bin` scripts stored as mode
`100644`, which is why builds needed "Fix Render build permissions" commits and why
`vite build` failed on a clean checkout with `@rollup/rollup-linux-x64-gnu` missing.

Now:

- `node_modules/` is untracked and git-ignored.
- `.node-version` = `22.12.0` (Vite 7 requires `^20.19 || >=22.12`; the old pin was 18.19.0).
- `web/package.json` declares `engines.node >= 20.19.0`.
- Verified locally: `rm -rf node_modules dist && npm ci && npm run build` → `dist/index.html`.

---

## Database

Apply once, before enabling accounts:

```bash
psql "$SUPABASE_DB_URL" -f web/supabase/migrations/0001_engagement.sql
# or: supabase db push
```

Creates: `profiles`, `wallets`, `wallet_transactions`, `matches`, `match_players`,
`tournaments`, `tournament_entries`, the `leaderboard` view, RLS policies, the signup
trigger, and the service-role-only `credit_wallet` / `add_tournament_points` /
`ensure_current_tournament` functions. It is re-runnable.

Money is stored as **integer cents** (`bigint`). There is no floating-point balance
anywhere in the system.

---

## M-Pesa

`src/lib/mpesa.ts` handles phone normalisation and Daraja password construction.
The wallet currently settles in **demo mode**. To go live you need:

1. Daraja credentials in the Render env: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
   `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_CALLBACK_URL`, and `MPESA_MODE=live`.
2. A public HTTPS callback (Render gives you this).
3. A B2C shortcode + initiator for payouts.

Until then `MPESA_MODE=demo` keeps every flow testable with play money, and no
real-money claim is made in the UI.

---

## Design decisions worth knowing

- **First to bring all four tokens home wins.** Everyone else is ranked by distance
  travelled. Money matches stay short and unambiguous.
- **Ratings** are Elo with `K=32` for wins, `K=16` for losses, and a 0.35 damping
  factor against bots so bot-farming cannot inflate the ladder.
- **Prize pool** = `entry × players × 0.9`; the 10% rake is a single constant
  (`PLATFORM_RAKE`) used by the UI, the engine, and settlement.
- **Daily bonus** = 20 → 100 KES, +10 per consecutive day, reset after a missed day.
- **Tournament points** = placement points + capture bonus, doubled in Beast Mode.
