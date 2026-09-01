# PLAT-16 — a page that cannot read its content is no longer served as an empty one

**Sprint 06 — _Deepen where the click is_** · `platform` · 3 points · owner
`design-systems-engineer` · 02 September 2026

Branch `ianng89/plat16-pillarcache` → **`master`** (site code AND this log; see
"Where this landed"). Reviewer: **Claude**, two independent adversarial passes.
No Codex, no `codex-reviewer`, no `/autopilot` reviewer.

---

## What was wrong

`/artikel/[category]` soft-failed **both** of its content reads:

```ts
let view = { clusters: [], unclustered: [], totalArticles: 0 };
try   { view = await withDeadline(getPillarView(id), 3_000, label); }
catch (err) { console.error(label, err); }          // …and carry on rendering
```

A blown deadline therefore rendered UI-05's designed empty state — **"Panduan
ini masih kosong"** on a pillar, **"Kategori ini masih kosong"** on the grid —
at **HTTP 200**. Three things went wrong at once:

1. **The page lied.** A failed read and a genuinely empty category produced
   identical UI. The reader is told a fact about our editorial calendar when the
   truth is a database blip.
2. **The 200 is cacheable.** `/artikel/:category` is served with
   `Vercel-CDN-Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
   (`next.config.ts`), so one unlucky render publishes an empty topic hub at the
   edge for up to fifteen minutes — and the purge chain has no reason to fire,
   because nothing was published.
3. **The JSON-LD says so too.** `numberOfItems: 0`, `hasPart: []`, on a hub
   `generateMetadata` had just failed OPEN to `index, follow`
   (`ROBOTS_ON_DEADLINE_MISS`, deliberately). The artefact Google may collect is
   an indexable hub stating in machine-readable form that it contains nothing.

## What changed

| File                                                | Change                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/cache/degraded-render.ts`                    | **new.** `readForCacheablePage` — logs and re-throws. Rethrows Next's `NEXT_*` control-flow sentinels untouched. |
| `src/lib/inspire/category-render-budget.ts`           | **new.** One deadline budget per request, derived from `maxDuration`, shared by `generateMetadata` and the page via React `cache()`. |
| `src/app/(public)/artikel/[category]/page.tsx`        | both content reads hard-fail; the third read (`getCategoryHierarchyCached`) gained a deadline it never had; all nine reads moved onto the shared budget. |
| `src/components/inspire/pillar-body.tsx`              | the comment saying the empty state doubles as the failure shape — no longer true.        |
| `src/app/(admin)/admin/design-system/page.tsx`        | **the reference page, same change.** The P6 entry said the same thing and now says what the failure actually does, including the gap it leaves. |
| `scripts/verify-degraded-page-uncacheable.mjs`        | **new.** The instrument. `pnpm verify:degraded`.                                         |
| three `__tests__` files                               | the cheap gates that run on `pnpm test`.                                                 |

---

## The failing case, forced for real

**Named:** `getPillarView` / `getCategoryArticles` blow their deadline while the
category lookup succeeds — which is the precondition for reaching the render at
all.

**Forced by** taking `ACCESS EXCLUSIVE` on the `articles` table in an open
transaction, so every SELECT touching it BLOCKS. A genuine stall, not a thrown
error and not a mock. Deliberately **selective**: `inspire_categories` stays
readable, so the route still resolves the category and still reaches the render.
Locking the whole database would fail earlier, on a path that was never the bug.

Local Postgres only, with a hard loopback assertion before any connection opens
— `.env` in these worktrees points at the **production** pooler and `.env.local`
overrides it, so "which file won" is checked, never assumed.

### BEFORE — `BUILD_ID 0AGGUS9nU17ed809rQLK5`

```
[stalled #1  ] HTTP 200   3800ms    30666B  pillar-emptyx2  grid-emptyx0  article-hrefx0
[recovered   ] HTTP 200     49ms    41941B  pillar-emptyx0  grid-emptyx0  article-hrefx4
FAIL  A  a stalled content read produced HTTP 200 carrying an empty state (pillar-empty)
         — and the response is served with Vercel-CDN-Cache-Control: public,
         s-maxage=300, stale-while-revalidate=600, so the edge keeps that answer
PLAT16 EXIT: 1
```

The grid shape, same build: `HTTP 200 3075ms grid-emptyx2 article-hrefx0`.

### AFTER — `BUILD_ID j93XFC0b4-YHe8mhoTNK5`

```
[stalled #1  ] HTTP 500   3120ms    17760B  pillar-emptyx0  grid-emptyx0  article-hrefx0
[stalled #2  ] HTTP 500   3034ms    17760B  pillar-emptyx0  grid-emptyx0  article-hrefx0
[recovered   ] HTTP 200     48ms    40708B  pillar-emptyx0  grid-emptyx0  article-hrefx4
PASS  A   … did not produce a cacheable empty page (HTTP 500, empty markers: none)
PASS  B2  the recovered page carries 4 /artikel/{cat}/{slug} links
PASS  C   the stalled request finished in 3120ms, inside the route's declared
          maxDuration of 5000ms — so the throw above is one production reaches
PLAT16 VERDICT: PASS
```

Grid shape, same build: `HTTP 500 3044ms` → recovery `HTTP 200 49ms
article-hrefx15`. Full logs in `plat-16-EVIDENCE/`.

**"The next request re-renders rather than serving the empty page"** is the
`recovered` line: 4 and 15 real article links, zero empty-state markers, on the
request immediately after the lock is released.

---

## THE BRIEF'S MECHANISM IS NOT THE ONE THAT WAS RUNNING

The DoD says: _"the route declares `revalidate = false`. Next therefore has a
valid page to cache and caches it indefinitely; only `revalidateTag('articles')`
or `revalidateTag('inspire-categories')` from an admin write can clear it."_

**Measured, and it is wrong on this route.** The evidence:

```
Route (app)                       Revalidate  Expire
├ ○ /artikel                             10m      1h
├ ƒ /artikel/[category]                                  ← no Revalidate, no Expire
├ ● /artikel/[category]/[slug]
ƒ  (Dynamic)  server-rendered on demand
```

```
HTTP/1.1 200 OK
Vercel-CDN-Cache-Control: public, s-maxage=300, stale-while-revalidate=600
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
```

The route awaits `searchParams`, so it is **dynamic**. There is no ISR entry to
poison, `revalidate = false` is inert, and `revalidateTag` is not what would have
cleared it. `.next/prerender-manifest.json` lists only `[category]/[slug]` under
`dynamicRoutes`, independently confirming it. `src/lib/cache/edge-tag.ts` already
recorded this on 26 Aug — _"these pages read `searchParams`, so they are dynamic
function responses whose CDN entry is created by the TTL header rather than by
ISR"_.

**What actually persisted the empty page is the Vercel edge: fifteen minutes
(300s fresh + 600s stale), for every visitor, cleared by no purge because nothing
was published.** Bounded, not indefinite — and still wrong, which is why the fix
is the same either way. The item's severity is one notch lower than written and
its blast radius is unchanged.

**Correction filed at source:** sprint evidence on PLAT-16 (below) carries this
verbatim.

---

## The category grid route: SAME EXPOSURE. Stated explicitly.

It is not a separate route — it is the other branch of the same file. The
non-pillar path soft-failed `getCategoryArticles` in exactly the same shape, at
the same 3s deadline, on the same URL pattern carrying the same
`Vercel-CDN-Cache-Control`, and rendered `EmptyCategoryState` at HTTP 200 with
`numberOfItems: 0` in the CollectionPage JSON-LD.

It is arguably **worse**: the grid path serves the eight non-pillar hubs as well
as the seven pillars, and its 200 is the one `generateMetadata` had just marked
`index, follow`.

**Fixed in the same change and verified by the same instrument** —
`/artikel/idea-dan-nasihat`, before `HTTP 200 3075ms grid-emptyx2`, after
`HTTP 500 3044ms` → `HTTP 200 49ms, 15 article links`.

A third soft-fail was found on that path in review and fixed too:
`getCategoryHierarchyCached` had **no deadline at all**, so a stall on
`inspire_categories` (rather than `articles`) hung the render with no error, no
label and no log. Its result decides `categoryIds`, so soft-failing it would have
rendered a NARROWER article set as though it were the whole category — a quieter
lie than the empty page and a harder one to notice.

---

## Two honest limits on the evidence

1. **The 500 body is a client-rendered shell.** Measured: the document is
   `<html id="__next_error__">` carrying the correct `<title>` and the JS
   bundles, and **not** the words "Ada masalah teknikal". Next does not
   server-render `error.tsx` for an uncaught error on the initial document. A
   reader with JavaScript gets the designed retry page after hydration; a reader
   without it gets a blank 500. And `src/app/error.tsx` is the app's only
   boundary, so it renders **outside** `(public)/layout.tsx` — no masthead, no
   footer, no way to another category. **This is a real regression against the
   (untrue) empty state it replaces**, accepted deliberately: a blank 500 tells a
   crawler "come back", while a 200 saying "this pillar is empty" is a statement
   Google may believe and the edge will repeat. Raised as a follow-up below.
2. **Vercel's treatment of a 5xx is documented, not measured here.** The response
   still carries `Vercel-CDN-Cache-Control` — that header comes from
   `next.config.ts` `headers()`, which matches on the request path and cannot see
   the status, and a server component cannot set a header on its own response.
   Vercel documents that its Edge Network does not cache 5xx. Forcing a real
   production DB failure to measure it is not something this item will do. **The
   symptom to watch for, if that ever changed, is a 500 served with a non-zero
   `age` — not the empty page.**

---

## The gates, and both directions of each

A gate seen only to pass is half-proven.

| Gate                                                                | Fires on the defect                                                                            | Clears on the fix          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- |
| `__tests__/degraded-render.test.tsx` — pillar throws                 | pre-fix route: `AssertionError: promise resolved "{ …(10) }" instead of rejecting`               | 4 tests pass               |
| same — grid throws                                                   | grid soft-fail injected: `promise resolved "{ …(10) }" instead of rejecting`                     | passes                     |
| same — genuinely empty still RENDERS (both shapes)                   | would fail a route that threw on everything                                                       | passes                     |
| `category-render-budget.test.ts` — no fixed per-read deadlines        | pre-budget route: **8** bare `3_000,` lines (the 9th read had no deadline at all)                | 0 literals, 9 `budgetLeft()` |
| script assertion **A**                                               | `FAIL A … HTTP 200 carrying an empty state`                                                       | `PASS A … HTTP 500`        |
| script assertion **C**                                               | one-pass budget rebuilt on purpose: `FAIL C … 7138ms against a declared maxDuration of 5000ms`   | `PASS C … 3120ms`          |
| script assertions **B1/B2/B3** (green control)                       | —                                                                                                 | reach exit 0 on a real page |

`pnpm test` — **39 files, 521 tests, all pass.** `pnpm typecheck` — exit 0.
`pnpm lint` — 0 eslint errors (157 pre-existing warnings); the 6 Prettier
failures are pre-existing files this change does not touch.

---

## Retrospective

### What we learned that is not written down

**`next start` does not enforce `maxDuration`, so a locally measured FAILURE
path can be one production never reaches.** This is the finding of the item, and
it nearly shipped as its opposite.

The fix was correct. The evidence was for an artefact that does not exist. The
route declares `maxDuration = 5` and gave each of its nine reads a separate
`withDeadline(…, 3_000)` — `generateMetadata`'s chain alone permitted 9s — so the
stalled request took **6,188ms before the fix and 7,704ms after it**. On Vercel
that render is killed at 5,000ms: neither the throw nor its `console.error` would
ever have run, and the whole "the reader gets a 500" story described a response
no reader receives. Every assertion in the instrument was true. None of them knew
there was a ceiling.

A second, sharper one underneath it: **a failing request pays the deadline chain
TWICE.** Next's error document re-enters `generateMetadata` in a fresh React
`cache()` scope and stalls again. Measured at three budgets — 3,000ms per read →
6,188ms; a 3,500ms shared budget → 7,138ms; the derived 1,500ms → 3,187ms. The
first attempt at a fix, sized against one pass, landed **further outside
`maxDuration` than the defect it replaced**. Sizing a budget against the happy
path's shape is not sizing it.

### Which document must change, and who owns the edit

1. **`scripts/verify-degraded-page-uncacheable.mjs`** — owner:
   `design-systems-engineer` (me). **DONE in this change.** Assertion **C** reads
   `export const maxDuration` out of the route and fails the run when the stalled
   request exceeds it. Verified red at 7,138ms on a deliberately rebuilt one-pass
   budget, green at 3,120ms. A gate, not a sentence.
2. **`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/design-systems-engineer.md`**
   — owner: me. **DONE.** The persona has ten rules about not trusting a
   measurement and none about the measurement being of the wrong machine.
3. **Nothing, and that is the point — I nearly filed a finding that had already
   been fixed.** The draft of this entry said `docs/work-done/README.md` does not
   exist and called itself the third confirmation after PLAT-19 and DES-18. It
   was true of my branch point (`9b0502b`) and false of `master`: **UI-20 created
   the file on 02 Sept**, in one of nine commits that landed while this item was
   being built, saying in its own words that it created it "rather than report it
   a fourth time". `git ls-tree origin/master` was what caught it, one command
   before the claim shipped.

   The companion half is stale too: `scripts/measure/count-in-html.sh` **is** on
   `origin/master` and in this worktree. Both halves of that finding are closed.

   **A STALE BRANCH MAKES YOUR ABSENCES LIE, and an absence is exactly what a
   finding is.** Nine commits is a few hours on this repo. Anything reported as
   missing has to be checked against the remote, not the checkout — owner: me,
   and written into the persona as a rule (below).

### What we did twice

- **Measured the pillar twice and got opposite verdicts.** The first
  post-instrument run reported `PLAT16 VERDICT: PASS` against the **unfixed**
  build, `HTTP 200 28ms … article-hrefx4`. The `unstable_cache` entry was warm
  from the previous run, so the locked table was never read and nothing was
  tested. The guard added for it was latency-only, and reviewers showed **that
  was still insufficient**: on a pillar URL `generateMetadata` blows the deadline
  against the locked table even when `getPillarView` answered warm, so a slow
  answer proves something stalled, not that the page's read did. The guard now
  also refuses any 2xx carrying article links — a stalled render cannot produce
  the real page.
- **Built the app four times** to move one constant, because the number could
  only be established by measuring. That was the right cost.
- **The local Postgres died twice mid-run** (WSL idling out). Both times the
  script exited **2**, not 1, and said `could not hold the lock: ECONNREFUSED` —
  the exit-code split earned its keep within an hour of being added.

### What we nearly shipped, and what caught it

1. **A fix whose measured behaviour production cannot produce** (the 7,704ms
   throw against a 5,000ms ceiling). Caught by **both** Claude reviewers
   independently, each naming it their most important finding. Nothing in the
   instrument, the tests or the build would have caught it — assertion C exists
   now precisely because nothing did.
2. **A gate covering half of what the change touched.** The route test only
   exercised the PILLAR path, so re-wrapping the grid's read in the old soft-fail
   left the suite green. Caught in review.
3. **`readForCacheablePage` swallowing Next's `notFound()` and `redirect()`
   sentinels**, turning an intended 404 into a 500 logged as a database failure.
   Not reachable from either current call site — reachable from the next one, and
   the docblock invites reuse. Caught in review.
4. **A reference-page paragraph contradicting, in the same commit, the module it
   pointed at.** It claimed the reader gets "Ada masalah teknikal … Cuba Semula"
   at HTTP 500; the module said, measured, that the string is not in the
   document. Caught in review.

### The one that landed after the retrospective was written

**A CI toolchain you did not pin is a dependency that can change under you for
ONE BUILD and change back.** PLAT-16's merge deployed into a Vercel builder
running pnpm 11.x where the merge ten minutes earlier had run 10.28.0, and
failed. Selection returned to 10.28.0 on the very next build and has stayed
there — see the corrected table above. The intermittency is the dangerous part:
a permanent break gets fixed, a one-in-eight break gets called flaky.
The failure named six packages, four of which were already allow-listed — so
the error message pointed at a list that was correct and being ignored.

It cost a third PR (#66) and it produced the same lesson this repo already has
written down in `scripts/measure/count-in-html.sh`: **the first fix was
confident, specific and wrong.** Moving `onlyBuiltDependencies` into
`pnpm-workspace.yaml` was the obvious repair, it is what the docs for pnpm 10
describe, and it fails with the BYTE-IDENTICAL error — which reads exactly like
having changed nothing at all. The setting had also been renamed to
`allowBuilds`, a map rather than a list, and the only place that said so was the
file pnpm rewrote for me when I ran the fix against the failing case.

**"I understand the cause" is not a test, and an unchanged error message is not
evidence that your change did nothing.** Run it.

**WHICH FILE MUST CARRY THIS, named as directed: `pnpm-workspace.yaml`.** It is
the file anyone touching pnpm settings opens, it is where the setting now lives,
and it now carries the whole transcript — the two build logs, the eight-build
version table, the three-run paired test, the correction that this fix did not
unblock the deploy, and the corepack fact that makes the obvious pin inert. A
`docs/` note would not be read by the person editing pnpm config; this file
cannot be missed by them. Owner of the edit: me, done in this change.

Owner of the remaining decision: **platform / CEO** — pinning the pnpm version
needs `ENABLE_EXPERIMENTAL_COREPACK` on the Vercel project, which is a change to
the deployment target rather than to this repo.

### Open findings raised, not fixed here

| Finding | Owner |
| --- | --- |
| **The 500 has no server-rendered body.** `src/app/error.tsx` is the app's only boundary and is a client component, so a no-JS reader gets a blank 500 on all 15 hub URLs, and even a JS reader lands outside `(public)/layout.tsx` with no masthead, footer or link out. A `(public)/error.tsx` would at least keep the shell. | product-designer / design-systems-engineer |
| **`generateMetadata` and the page now resolve the SAME failure in opposite directions.** Metadata's `getCategoryArticles` fails OPEN to `index, follow` and that verdict is frozen into an `unstable_cache` entry with `revalidate: false`; the page's copy of the same read now fails CLOSED. So a hub whose count could not be established can carry a permanently cached "indexable" robots verdict derived from a read the same request refused to render on. Same family of bug as PLAT-16, different lever. | platform / CEO |
| **Removing the cacheable 200 removes load absorption during a stall.** Every request during a DB incident is now a fresh origin render against a 5-wide pool, where before one render's 200 answered ~300s of edge traffic. The 1,500ms budget bounds each attempt; there is still no retry, backoff or circuit breaker anywhere in the read path. | platform |
| **Both halves of the PLAT-19 / DES-18 tooling finding are CLOSED.** `docs/work-done/README.md` exists on `master` (created by UI-20, 02 Sept) and `scripts/measure/count-in-html.sh` is present. Recorded so a fifth agent does not re-report them. | CEO |
| **Vercel's pnpm major is non-deterministic and unpinnable from this repo alone.** One build in the last eight (`0f2a4c99`) was handed `pnpm@11.x` and failed; the other seven got 10.28.0. `package.json` has no `packageManager` field, and pinning one is INERT because `ENABLE_EXPERIMENTAL_COREPACK` is not set on the Vercel project (15 keys enumerated, no corepack flag) — Vercel's own failing build log says corepack is how you select a non-default major. So the pin is a two-part change: one line here plus an env var on the deployment target. `allowBuilds` in `pnpm-workspace.yaml` makes an 11.x build SUCCEED rather than preventing one, and is verified under `npx pnpm@11` — it is a defence, not a pin. **Decision needed:** set the corepack flag and pin 10.28.0, or stay on `allowBuilds` and accept either major. | platform / CEO |

---

## Where this landed

- **Site code** — `src/`, `scripts/`, `package.json` → **`master`**, by PR merged
  with a merge commit.
- **This log** — `docs/work-done/…` → **also `master`**. Checked by content, not
  by branch name, per the standing rule: `docs/work-done` is tracked on `master`
  (427 files at the start of this session) and every previous session's entries
  live there. It is not the boardroom docs line, and no PR was opened into
  `feat/command-centre-dashboard`.

## Shipping it broke on something else entirely

**PLAT-16 merged as `0f2a4c9` and its production deployment FAILED.** Not the
diff — Vercel rolled its default pnpm from **10.x to 11.x between 19:17 and
19:27 UTC**, and PLAT-16's merge was simply the first deploy to land on the far
side of it. Two production builds ten minutes apart, same lockfile, both read
from the Vercel build logs:

| | commit | pnpm | ignored builds | result |
| --- | --- | --- | --- | --- |
| 19:17 | `0129797` (UI-20) | `v10.28.0` | `msw@2.15.0` — a **warning** | success |
| 19:27 | `0f2a4c9` (PLAT-16) | `11.x` | `esbuild`x3, `msw`, `sharp`, `unrs-resolver` — **`ERR_PNPM_IGNORED_BUILDS`** | failure |

The only manifest difference between those commits is one added npm script
line; `pnpm-lock.yaml`, `.npmrc` and `vercel.json` are untouched; and
`pnpm build` on `0f2a4c9` is exit 0 locally. Every branch in the repo was
undeployable, not just this one.

**THREE things changed at once, and the third is the one that bites.**

1. pnpm 11 makes an ignored build script a HARD ERROR, not a warning.
2. **pnpm 11 no longer reads the `pnpm` field in `package.json`** — which is
   why `sharp`, `esbuild` and `unrs-resolver` were in the error list at all:
   they were ALREADY allow-listed there and the allow-list stopped being read.
3. **The setting is also RENAMED**: `onlyBuiltDependencies` (a list) became
   `allowBuilds` (a map of package to boolean). Moving the old key into
   `pnpm-workspace.yaml` verbatim **fails with the byte-identical error**,
   which is indistinguishable from having changed nothing.

That third one is the whole lesson, and it is the same lesson as
`scripts/measure/count-in-html.sh`: **the first fix was confident, specific and
wrong, and only running it against the failing case caught it.** pnpm rewrote
`pnpm-workspace.yaml` itself and prepended `allowBuilds: { esbuild: set this to
true or false }` — the entire answer, invisible from the error message.

Verified against the failing case, three runs of one command:

```
package.json list only          npx pnpm@11 install --frozen-lockfile  ->  exit 1
onlyBuiltDependencies in yaml   same command                           ->  exit 1
allowBuilds in yaml             same command                           ->  exit 0
                                "Done in 14.8s using pnpm v11.25.0"
```

and the scripts actually run — `sharp install$ node install/check.js`, three
esbuild postinstalls `Done` — after which `require('sharp')` loads libvips
8.17.3. `sharp` is the entry that matters: `next.config.ts` lists it in
`serverExternalPackages` and it does the site's image processing.

Shipped as **PR #66**, `9c1ca0c`, production deployment `6209298019`
**state=success**.

### ⚠ AND THEN THAT CLAIM TURNED OUT TO BE WRONG — corrected here at source

The paragraphs above originally said Vercel had *"rolled its default pnpm from
10.x to 11.x"* and that *"every branch in the repo was undeployable"*, and the
line above reads as though PR #66 is what unblocked the deploy.

**None of that is supported.** It was written after watching exactly one
failure and one subsequent success. Challenged on it, the pnpm version was then
read out of the build log of the eight most recent production builds:

| commit | state | selected | version |
| --- | --- | --- | --- |
| `07fd6421` | READY | `pnpm@10.x` | v10.28.0 |
| `9c1ca0c2` | READY | `pnpm@10.x` | v10.28.0 — **the deploy of the fix itself** |
| `5c18c742` | READY | `pnpm@10.x` | v10.28.0 |
| `0f2a4c99` | **ERROR** | **`pnpm@11.x`** | — the only 11.x build that exists |
| `0129797a` | READY | `pnpm@10.x` | v10.28.0 |
| `5342703c` | READY | `pnpm@10.x` | v10.28.0 |
| `59954c65` | READY | `pnpm@10.x` | v10.28.0 |
| `eaad6d33` | READY | `pnpm@10.x` | v10.28.0 |

It was **not a rollout**. It was **one build** landing on an 11.x builder,
before and after which selection returned to 10.28.0. So:

- **PR #66 did not unblock anything.** The build carrying it succeeded on pnpm
  10.28.0 and would have succeeded without it. One green deploy after a fix is
  not evidence the fix did anything, when the variable moved back on its own.
- The `allowBuilds` change is still **correct and worth keeping** — the local
  three-run paired test under `npx pnpm@11` stands, and three subsequent pnpm
  10 builds are green with it in place, so it costs nothing. It is the defence
  for the next 11.x selection, not the cause of this green.
- **The exposure is not closed.** Builder selection is non-deterministic and
  can hand any deploy, from any branch, an 11.x builder with no change from
  anyone here.

This is the same error this entry's own retrospective is about, committed by
the same author about forty minutes later: **a comfortable result taken as
proof.** The failing run had a cause I could name; the passing run I did not
interrogate at all. `PLAT16 VERDICT: PASS` at 28ms and "the deploy is green"
are the same mistake in two different instruments.

### The pin that was asked for, and why it is not in this change

The direction was to pin `"packageManager": "pnpm@10.28.0"` — the exact version
that succeeded — as the smallest change that reverts the variable that moved.
The instinct is right and the exposure above is real. **But the pin is inert on
this project as configured**, and shipping it would have looked like a fix:

- Vercel's own build log says so, in the failing build: *"To use pnpm@9.x,
  manually opt in using corepack"*. Selecting a non-default major needs corepack.
- `ENABLE_EXPERIMENTAL_COREPACK` is **not set** on the Vercel project.
  Enumerated rather than tested for: the project has 23 environment entries
  across 15 unique keys — `ADMIN_EMAILS`, `CLERK_SECRET_KEY`, `CRON_SECRET`,
  `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`,
  `R2_ASSETS_BUCKET_NAME`, `R2_ASSETS_PUBLIC_URL`, `R2_BUCKET_NAME`,
  `R2_PUBLIC_URL`, `R2_SECRET_ACCESS_KEY`, `REKOGNITION_ENABLED`,
  `WP_SOURCE_URL` — and no corepack flag among them.

So the pin is a **two-part change**: one line in `package.json` plus an
environment variable on the Vercel project. The second part is an infrastructure
change to the deployment target, not a repo change, and it is not mine to make
unilaterally. Raised as an open finding below with the evidence attached.

## Live, on production

`0f2a4c9` is an ancestor of the deployed `9c1ca0c` (`git merge-base
--is-ancestor`, exit 0) and the deployed route source carries
`readForCacheablePage` x4.

| URL | status | pillar-empty | grid-empty | article hrefs |
| --- | --- | --- | --- | --- |
| `/artikel/hantaran-mas-kahwin` | 200 | 0 | 0 | **47** |
| `/artikel/nikah-undang-undang` | 200 | 0 | 0 | **19** |
| `/artikel/idea-dan-nasihat` | 200 | 0 | 0 | **34** |

**POSITIVE CONTROL** — a zero from this checker means absence, not a broken
check: the same `scripts/measure/count-in-html.sh` run against the same page
returns `HelloKahwin` **x52** and `Hantaran` **x262**.

**NEGATIVE CONTROL** — `/artikel/plat16-not-a-real-category` returns **404**,
not a 200 shell.

The forced-failure half cannot be run against production: it requires stalling
the database. It is run against `next build && next start` on the same commit,
which is what the numbers above the fold are.

## Reproducing this

```
pnpm build
pnpm exec next start -p 3216          # cold: rm -rf .next/cache first
pnpm verify:degraded -- --base http://127.0.0.1:3216 --slug hantaran-mas-kahwin
pnpm verify:degraded -- --base http://127.0.0.1:3216 --slug idea-dan-nasihat
```

It refuses to run against a non-loopback database, refuses to report a pass when
the data cache was warm, and prints the git SHA, the route source hash, the
declared `maxDuration` and the BUILD_ID it is measuring.
