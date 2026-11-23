# Agent prompt: rewrite a TypeScript app in a non-TypeScript language without breaking production

**How to use this file:** everything below the line is the prompt. Copy it into a
new agent session, fill in the `<>` placeholders at the top, and delete any
section that does not apply. It is written to be self-contained — the agent
should be able to work from it cold.

Swap the ReScript-specific material in Part 6 if you choose a different
language; Parts 1–5 and 7–9 are language-agnostic and are the parts that
actually decide whether this goes well.

---

## Mission

Rewrite `<REPO>` (currently TypeScript) in `<TARGET_LANGUAGE>` — a non-TypeScript
language that runs on Node — covering **everything**: engine, business logic, UI, build
config. Not a spike, not engine-first. Meanwhile `<PRODUCTION_URL>` must stay up
and keep serving a working app at every moment.

Three non-negotiables, in priority order:

1. **Production never breaks.** Not "briefly down", not "shows an error page for
   a minute". If you must choose between shipping and uptime, choose uptime.
2. **The result is genuinely in the target language.** TypeScript percentage on
   the repo's language bar goes to ~0. No `.ts`/`.tsx` left in application code.
3. **Behaviour is preserved exactly** where it is observable or money-related.

If at any point those three conflict, stop and say so rather than picking one
silently.

---

## Part 1 — Discovery. Do this before writing any code.

Do not skip this. Every one of the failures in the worked example (Part 10) was
caused by an assumption made here.

### 1.1 Find the build command that *actually* runs in production

This is the single highest-value thing you will do.

The command in `render.yaml` / `Dockerfile` / `netlify.toml` / CI config is
**not necessarily** what the hosting platform runs. Dashboards override repo
config, and blueprints drift. Ask the user for **one real build log** from the
project before you change anything, and read these three lines out of it:

- the exact `buildCommand` string
- the exact `staticPublishPath` / output directory
- the runtime version (Node, from `.node-version` / `engines` / `NODE_VERSION`)

If the user cannot supply a log, say so explicitly, and design the build so it
works under **any** plausible command (see Part 3.2). Do not proceed believing
the repo config is authoritative.

Record the answers at the top of `docs/STACK-MIGRATION.md`.

### 1.2 Inventory what is actually alive

```bash
git ls-files | sed -E 's/.*\.//' | sort | uniq -c | sort -rn   # file types
git ls-files | wc -l                                            # repo size
```

Look for **dead trees** — directories that are not referenced by the build.
Check before deleting:

```bash
grep -rn "<dir>/" package.json vite.config.* Dockerfile render.yaml .github 2>/dev/null
```

Dead code inflates the TypeScript percentage and hides the real surface area.
But it may contain things worth keeping: SQL migrations (often the only record
of a live database schema), environment variable names, feature flags, or
business rules. **Extract anything load-bearing before deleting anything.**

### 1.3 Find the frozen oracle

Locate the existing test suite. Those assertions are your specification — port
their *expected values verbatim*, do not re-derive them. If the suite has N
tests, the port must have at least N covering the same behaviours.

Identify any pure function whose output is externally observable (RNG, hashing,
money maths, scoring, date handling). These need **bit-exact** parity, not
"looks right". See Part 5.

### 1.4 Fingerprint the current production output

Before you touch anything, fetch `<PRODUCTION_URL>` and record **three
distinctive strings** from the rendered HTML — user-visible copy that will
differ after your rewrite. Example: a headline, a button label, a tagline.

This is how you will prove later that a deploy actually happened. "The page
returns 200" proves nothing, because the old page also returns 200. You need
content that is unique to the old build and content that is unique to the new
one.

Record both sets in `docs/STACK-MIGRATION.md`.

### 1.5 Confirm the toolchain exists

Actually run the target language's compiler in the sandbox before committing to
it:

```bash
<target-lang> --version
```

Do not assume. Several perfectly good languages (Dart, F#, Java) are absent from
most sandboxes and will add a toolchain-install detour that the deploy
environment may not survive. If the binary is not present and cannot be fetched,
pick a different language and say why.

---

## Part 2 — Choose the language

Requirements, in order:

1. **Runs on Node.** The deploy is static files or a Node server. The target must
   compile to JavaScript (or be Node-native) so the hosting shape does not
   change. Do not take on a container rewrite unless the user explicitly wants
   one.
2. **Toolchain available in the sandbox** (Part 1.5).
3. **Interops with the existing framework.** The app is React; the language must
   have a maintained React binding, or you must rewrite the view layer too.
4. **Real type soundness.** The point is catching bugs TypeScript does not, so
   avoid anything with `any`-equivalent escape hatches everywhere.

`<TARGET_LANGUAGE>` must be justified in these terms in
`docs/STACK-MIGRATION.md` before you start.

### Which language, for which project

You have several projects; they need not all use the same language. Pick per
project against Part 2, but here is the honest trade-off:

| Language | Best when | Watch out |
|---|---|---|
| **ReScript** | React UI, needs sound types, wants smallest diff from TS habits | Small ecosystem; stdlib differs from JS in ways that bite (Part 6) |
| **Elm** | Self-contained UI, you want the compiler to make runtime errors near-impossible | No incremental adoption; full rewrite of the view layer; no JS interop |
| **ClojureScript** | Lots of data transformation, REPL-driven work | Very different syntax and idiom; hiring/reading cost |
| **Gleam** | BEAM ergonomics wanted, or clean small modules; excellent error messages | React interop is workable but thinner than ReScript's |
| **F# / Dart** | Team already knows them | Toolchains often absent from sandboxes — verify before committing (Part 1.5) |

**Recommendation for a React project you actually ship:** ReScript, because the
UI can be ported component by component while the app keeps working. Anything
that requires rewriting the view layer in one atomic step raises the risk of
production going dark for a period, which violates non-negotiable 1.

Language choice is itself an assumption worth stating out loud to the user
before starting. "Choose any suitable language" still deserves a one-line
justification and a chance to object.

---

## Part 3 — Preserve the deploy contract

### 3.1 Keep the build shape identical

Do **not** change:

- the service type (static stays static)
- the output directory
- the install command's assumptions
- the routing / SPA rewrite rules
- the runtime version

Changing the *source language* must not be visible to the deploy platform.

### 3.2 Make the build impossible to get wrong

If your compiler's output is git-ignored (it should be — committed build output
drifts), then any build command that skips compilation will fail with a
confusing "module not found". Hosting dashboards are exactly the place where
such a command hides.

Harden it in two places:

```jsonc
// package.json
"scripts": {
  "build": "<compile> && <bundle>",
  "postinstall": "<compile>"        // ← the safety net
}
```

`postinstall` runs after every `npm ci`/`npm install`, so the compiled output
exists **regardless of which build command the platform uses**. Then also make
the documented command the correct one:

```yaml
buildCommand: npm ci && npm run build   # not a bare `bundle` command
```

Add a comment next to it explaining why, so a future edit does not undo it.

### 3.3 Leave rollback intact

Do not force-push, do not rewrite `main`'s history, and do not delete the
previous build artifacts until the new one is verified live. Most static hosts
keep the last good deploy while a new build fails — that is your safety net, and
it only works if you leave it alone.

---

## Part 4 — Migration order

1. **Scaffold** — package manifest, compiler config, bundler config. Get a
   "hello world" building and serving before porting any real code.
2. **Pure logic first** — types, then leaf modules (board geometry, RNG,
   formatting), then the rules/business engine. These are testable in isolation
   with no UI.
3. **Port the tests alongside the module** they cover, not afterwards. A module
   without its oracle test is unverified.
4. **UI last**, and component by component. Keep the visual design identical
   unless asked otherwise — a rewrite is not a redesign, and reviewers need to
   see that behaviour did not change.
5. **Delete the old tree only when** the new one passes the full suite and the
   build is green from a clean clone.

Commit in that order. Small commits, each one building.

---

## Part 5 — Parity verification (the part that finds real bugs)

Plausible-looking output is the enemy. Uniform random numbers, sensible scores
and reasonable dates can all be wrong in ways no human will spot by reading
them.

For every pure function with an external contract:

Compile first — the snippet imports the compiler's *output*, not your source:

```bash
<compile>          # e.g. rescript build — otherwise the import below 404s
```

```js
// 1. Extract the OLD implementation as the oracle, verbatim.
const oracle = (seed, cursor) => {
  /* copied exactly from the TypeScript source */
};

// 2. Import the NEW implementation.
const NEW = await import("./src/engine/Rng.mjs");

// 3. Diff across a wide input space — not three hand-picked cases.
let bad = 0, n = 0;
for (const seed of [0, 1, 7, 42, 2024, 65535, 2147483647, 4294967295]) {
  for (let c = 0; c < 400; c++) { n++; if (oracle(seed, c) !== NEW.next(seed, c)[0]) bad++; }
}
console.log(`${n} comparisons, ${bad} mismatches`);
```

Rules:

- **Zero mismatches or it is not done.** Not "close enough", not "distributionally
  similar".
- Then **pin it**: add a test that asserts against the oracle, so future edits
  cannot silently drift. Comment it as the frozen reference.
- Do this for anything that persisted data depends on. If a match log, a stored
  rating, a hashed value or a ledger entry was produced by the old function,
  the new one must reproduce it exactly or that data is invalidated.

Run the parity harness on **your own rewrite** too, not just against the
original. In the worked example, three separate versions of one function all
looked healthy and all three were wrong in different ways.

---

## Part 6 — Language traps

These are the ones that cost real time on this migration. They are ReScript
specific; if you choose another language, replace this section but keep the
*shape* — a list of concrete, already-hit footguns with the fix, not a tutorial.

**Encoding collisions**

- **`Some(0)` and `None` can encode identically.** If a function returns an
  option of a number, `Some(0)` may be indistinguishable from "no value". Any
  "target position / index / amount" that can legitimately be `0` must use a
  nullable type, not an option. This silently made a move illegal in a game and
  would never have thrown.
- **Options cross the JS boundary as bare values.** `Some(x)` becomes `x`,
  `None` becomes `undefined`. JS tests must pass a raw value or `undefined`, not
  a wrapper.

**Build**

- Compiled `.mjs` is git-ignored, so a build command that skips compilation
  fails to resolve the entry module. Covered by `postinstall` (Part 3.2).
- A "successful" compile that emits nothing, while the previous output is
  missing, is usually a corrupted cache: `rm -rf lib node_modules && npm ci`.
  Watch for `Compiled 0 modules` as the tell.

**Environment**

- Installing a pinned Node (`npm i node@22.12.0` for Part 8) into
  `/tmp/node_modules` puts an `@rescript/core`-less `node_modules` on the
  resolution path. A later build then fails with
  `upward traversal did not find '@rescript/core'` **even though the project's
  own `node_modules` is intact**. Install the pinned runtime outside the project
  and remove it (or `npx` it) before building. The same class of breakage shows
  up as an empty `node_modules` after a sandbox restart — if `ls node_modules |
  wc -l` is 0, `npm ci` before diagnosing anything else.

**Standard library shape**

- `Array.map`/`filter`/`reduce`/`forEach` are **pipe-first**: `arr->Array.map(f)`.
- Indexing returns an `option`, not the element. Use
  `arr->Array.get(i)->Option.getWithDefault(d)` or `getUnsafe(i)`.
- `Array.forEachWithIndex` passes `(element, index)` — not `(index, element)`.
  `Array.mapWithIndex` passes only the element.
- No `Float.round`, no `Float.pow`. Declare the JS maths directly:
  `@val external mathRound: float => float = "Math.round"`.
- `Int` is 32-bit and wraps automatically. Widen to `float` *before* correcting
  the sign, or the correction wraps back to the original value.
- No spread in pattern matches on arrays. Use `Array.get` / `Array.slice`.

**JSX**

- Arrays must be wrapped: `{React.array(items->Array.map(...))}`.
- One component per module. Extract sub-components into their own files.
- JSX props are not spreadable the way TS allows. Write small named components
  instead of a config object.

**Syntax**

- `!expr->fn(x)` parses wrongly — parenthesise.
- Record update spread inside an arrow argument breaks the parser. Write
  explicit field-by-field copy functions.
- A `switch`/`if` used as a function body must return the same type on every
  branch. A `useEffect` that returns a cleanup on one path must return
  `None`/nothing on all of them.

**Do not** rely on the compiler catching semantic drift — it catches type errors
only. A wrong constant is still a well-typed wrong constant. That is what Part 5
is for.

---

## Part 7 — Cleanup and language statistics

GitHub's language bar is **byte-weighted** across tracked files, not file-count
weighted. Measure, do not guess:

```bash
for ext in ts tsx <target> js mjs sql css html json md; do
  total=$(git ls-files "*.$ext" | xargs wc -c 2>/dev/null | tail -1 | awk '{print $1}')
  echo "$ext: ${total:-0}"
done | sort -t: -k2 -rn
```

Note that `package-lock.json` is usually the largest single file in a small
repo and will dominate the bar. If the user cares about the displayed
percentage, tell them that plainly rather than promising a number.

Before deleting a dead tree, re-read Part 1.2. Move anything load-bearing out
first, and say in the commit message what you moved and why.

Keep exactly one JavaScript file if the bundler genuinely requires a CSS
import that the target language cannot express. Document it in the README as a
deliberate exception with the reason.

---

## Part 8 — Definition of done

All of these must pass before you say the work is finished. Report each one
individually and say how you verified it.

- [ ] Zero `.ts`/`.tsx` files tracked in application code.
- [ ] Full test suite green: ported oracle tests + new coverage.
- [ ] **Clean clone** builds successfully (not your working tree — a fresh
      `git clone`), because git-ignored files and local caches hide failures.
- [ ] The build runs under the **production-pinned runtime version**, not just
      your local one. Install it explicitly if you must:
      `npm i --no-save node@<version>`.
- [ ] The **exact production build command** (from Part 1.1) succeeds. Test it
      literally, including a bare `<bundler> build` if that is what the platform
      runs.
- [ ] Production serves the **new** build, proven by content — the distinctive
      new strings are present, the old ones are gone, and the asset hashes on
      the live site match a local clean build.
- [ ] Deployed asset hash == locally reproduced hash. If they differ, the deploy
      is not the commit you think it is.
- [ ] `docs/STACK-MIGRATION.md` explains what changed, what parity was verified,
      what bugs the rewrite surfaced, and how to roll back.

Do not mark an item done because it is probable. Mark it done because you
executed the check.

---

## Part 9 — Reporting rules

- **Never claim a deploy succeeded based on HTTP 200.** Fetch the page and read
  the content.
- **Never claim "the code is fine" when a build fails.** Get the actual build log
  before forming a hypothesis. Guessing at infrastructure when the error message
  names a missing file wastes everyone's time.
- **Separate what you verified from what you assumed.** Say "I verified X by
  running Y" or "I have not verified X".
- **When you are wrong, say which specific claim was wrong** and what the
  evidence is. Do not quietly move on.
- **Surface risk you did not fix.** Client-side money handling, missing
  authz, security-relevant shortcuts. A rewrite is a good moment to flag them,
  and the user needs to know they exist.
- Report progress at natural checkpoints, not every file.

---

## Part 10 — Worked example (what the traps actually looked like)

Context: a Ludo game, React + Vite, static hosting. Rewritten in ReScript in one
pass with production staying live.

| # | What went wrong | How it was found | Cost |
|---|---|---|---|
| 1 | `Some(0)` == `None`, so a token leaving the yard registered as "no legal move". Tokens could **never leave the yard**. | A test asserting a legal move existed. No exception was thrown. | Would have shipped as "the game is broken" |
| 2 | RNG cursor used as a loop count instead of a multiplier, replaying a short cycle. | Parity harness against the old function. | Silent; dice looked random |
| 3 | mulberry32 tail multiplies by `t \| 61`, not the constant `61`. | Parity harness: 3219/3900 mismatches. Distribution was *fine* — only the reference exposed it. | Invalidated every stored match log |
| 4 | Production ran a dashboard build command (`vite build`) that skipped compilation. | The user pasted the build log: `Failed to resolve /src/Main.mjs`. | One failed deploy; site stayed up on the old build |
| 5 | 36 TypeScript files remained after "complete" rewrite — 35 in a dead tree. | `git ls-files \| grep -c '\.tsx\?'` | Language bar still said TypeScript |

Lessons worth carrying:

- **The build log is worth more than any amount of config reading.** Ask for it
  in the first message (Part 1.1).
- **Optics is a valid acceptance criterion** — check the language bar explicitly
  if the user mentioned it.
- **Parity harnesses find what tests and code review cannot.** Three bugs above
  were invisible to both.
- **A dead tree is not a free deletion.** It held a SQL migration and an economy
  module. Port what matters, then delete.
- **Keep the runbook** (`docs/STACK-MIGRATION.md`) up to date as you go. It is
  what makes the final report coherent and rollback possible.
