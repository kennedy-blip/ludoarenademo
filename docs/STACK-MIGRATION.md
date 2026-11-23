# Stack migration → ReScript

Status: **complete on `arena/a4d92d7d-ludoarenademo`.** Production is untouched
and still serving from `main`.

## What changed

The application was TypeScript + React + Vite. It is now **ReScript 12** + React
19 + Vite. There is no TypeScript left in the app: the engine, all UI components,
the wallet, and the browser entry point are `.res` files that compile to ES
modules.

The Next.js experiment in `web/` is retained for reference only. It is no longer
part of the deploy and is not built by Render.

## Why the deploy shape did not change

The important constraint was that https://ludoarenademo-1.onrender.com stay up.

Render runs, from `render.yaml`:

```
buildCommand:      npm ci && npm run build
staticPublishPath: ./dist
```

and `npm run build` is still `rescript build && vite build`. So:

- same service, same branch (`main`), same publish directory
- same static hosting, same `/*  →  /index.html` rewrite
- no DNS change, no domain cutover, no second service to flip

A push to `main` redeploys the ReScript bundle over the TypeScript one. Because
Render keeps the previous deploy until the new one is healthy, that swap is
atomic — if the build fails, the old site stays live.

The previous blueprint also defined a Next.js service (`ludo-arena-web`). It has
been removed: it was never routed to the public domain, and keeping it would have
meant paying for and building a service nothing serves.

## Equivalence

The port was checked against the behaviour of the TypeScript engine rather than
against a rewrite of the tests. `npm test` holds 37 assertions:

- dice are deterministic per seed, uniform across 12k rolls, and different seeds
  produce different matches
- a six leaves the yard; only a six leaves the yard; exact-finish rejects
  overshoot
- captures happen on unsafe squares and are refused on the eight safe squares
- a capture grants another turn; three sixes bust
- two- and four-player matches reach `Finished`, the winner has all four tokens
  home, and every player is ranked exactly once
- board geometry: 52 unique ring cells, five-cell home columns clear of the ring,
  four distinct yard slots per colour, every token on-screen after a full match
- `Verify.replay` reproduces a 164-move match from its seed, and rejects a log
  with one move altered
- the React components render (SSR smoke test) and the board emits all 225 cells

## What the port had to get exactly right

The RNG is the one place where "looks random" is not good enough. `Rng.next` is
now **bit-identical** to the TypeScript oracle in `web/src/lib/engine/rng.ts`,
verified over 5600 (seed, cursor) pairs and pinned by a test. That matters
because a match stores only `seed` + `cursor`: if the formula drifted, every
match log recorded before the port would replay to different dice and fail
verification.

Getting there took three corrections, each caught by comparing against the
oracle rather than by eyeballing output:

1. **The cursor is a multiplier, not a loop count.** The original is
   `t = seed + imul(cursor + 1, 0x6d2b79f5)`. An early version added the
   constant `cursor` times, which replayed a short cycle instead of advancing.
2. **The second multiply is by `t | 61`, not by the constant 61.** Reading
   `imul(t ^ (t >>> 7), t | 61)` as `61` still produces well-distributed
   numbers — it is only detectable against the reference.
3. **`Some(0)` / `None` collision.** ReScript encodes `Some(0)` and `None` the
   same way in some positions. A token leaving the yard targets progress `0`,
   which read as "no legal move", so tokens could never leave the yard. Move
   targets are now `Nullable`, where `0` and `null` are distinct.

## Local development

```bash
npm install
npm run dev      # rescript build -w & vite   → http://localhost:3000
npm test
npm run build
```

ReScript emits `.mjs` beside each `.res`. Those are generated, so they are
git-ignored; `build` and `test` both compile first.

## Rollback

`main` is unchanged. If the ReScript build ever fails on Render, the last
successful deploy keeps serving, and reverting the merge commit returns `main`
to the TypeScript app with no infrastructure changes.
