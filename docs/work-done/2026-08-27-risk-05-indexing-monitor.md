# RISK-05 — the indexing monitor

**Sprint 02 · 27 Aug 2026 · Murat (Test Architect)**
Branch `feat/risk-05-indexing-monitor`. Landed on `master` as `32e99e6`.
Evidence: `docs/work-done/2026-08-27-risk-05-indexing-monitor-EVIDENCE/`.

The DoD, verbatim, and not narrowed:

> A scheduled job inspects every URL in the live sitemap, records coverage_state
> per URL with the date, and files a loud alarm (the RISK-01 pattern — a GitHub
> issue within 10s) when any URL is unknown-to-Google or uncrawled more than 72h
> after appearing in the sitemap. Proved by deliberately feeding it a URL known
> to be unknown and showing the alarm fired. Runs from the DEFAULT branch.

---

## CLAIM 1 — a scheduled job inspects every URL in the live sitemap

**Evidence.** Run `32996238991`, dispatched from `master`, swept **92 of 92**
sitemap URLs through Google's URL Inspection API with **zero** not answered:

```
92 URLs in the live sitemap.
| bucket | count |
| alarming (dark >72h) | 0 |
| watching (dark, inside 72h) | 15 |
| not answered by Google | 0 |
alarm=false alarms=0 watching=15 blind=0 detectedAt=2026-08-26T17:52:50.161Z
```

The sitemap is fetched with **no cache-buster**, deliberately: the document
worth judging is the one actually served from the edge, because that is the one
Googlebot reads.

**Live link.** https://github.com/ianngkb/hellokahwin/actions/runs/32996238991

## CLAIM 2 — it records coverage_state per URL with the date

**Evidence.** Two artefacts per run, both in R2, from the run log:

```
upload: .tmp-indexing-monitor/snapshot.json to
  s3://hellokahwin-assets/indexing-monitor/2026/08/26/sweep-20260826T174656Z.json
archived: indexing-monitor/2026/08/26/sweep-20260826T174656Z.json
upload: .tmp-indexing-monitor/state.json to
  s3://hellokahwin-assets/indexing-monitor/state.json
ledger updated: indexing-monitor/state.json
```

The dated `sweep-*.json` is the immutable archive — one file per run, per URL:
`coverageState`, `verdict`, `lastCrawlTime`, `firstSeenInSitemap`,
`hoursInSitemap`, `reasons`. The mutable `state.json` is the ledger the 72h
window is measured from, and it goes up **last** so a run that dies mid-sweep
leaves yesterday's ledger intact rather than a half-written one.

**This is the part that makes it not a photograph, and it is proved separately.**
The second run did not start over — it found its ledger and read it back:

```
ledger exists in R2 — downloading (a failure here FAILS the run)
bytes: 30889
ledger     : loaded 91 URLs from .tmp-indexing-monitor/state.json
```

The download is checked for existence *separately* from being downloaded, so
"there is no ledger yet" and "the ledger is there and we could not read it"
cannot produce the same outcome. The second silently resets every grace window,
which would stop the alarm ever firing — a monitor that forgets is a photograph
taken daily.

## CLAIM 3 — a loud alarm, and it was measured at 1 second, not asserted

**Evidence.** Run `32995851727` filed
[issue #5](https://github.com/ianngkb/hellokahwin/issues/5). The job then
measured itself against the DoD's number:

```
detected at : 2026-08-26T17:46:55.678Z
issue at    : 2026-08-26T17:46:56Z
gap         : 1s
issue       : https://github.com/ianngkb/hellokahwin/issues/5
```

The script stamps `detectedAt` the instant the decision exists; the workflow
compares it against the issue's own `created_at` and **fails the job if the gap
exceeds 10 seconds**. An alarm that arrives late is a defect, not a warning.

Dedupe is by **label**, never by title — the title carries the count, so it
changes between runs. A repeating failure nags in one place.

## CLAIM 4 — proved by feeding it a URL known to be unknown

**Evidence.** [Issue #5](https://github.com/ianngkb/hellokahwin/issues/5), filed
by the workflow, closed after the proof:

```
| URL | coverage_state | reason | hours in sitemap | last crawled |
| https://hellokahwin.com/artikel/idea-dan-nasihat/risk-05-probe-2026-08-27
  _(deliberate probe)_ | URL is unknown to Google
  | unknown-to-google, never-crawled | 5705 | never |
```

**Which URL, and why it is a fair test.** A **fabricated path**,
`/artikel/idea-dan-nasihat/risk-05-probe-2026-08-27`. It 404s, so Google has
never seen it and never will — which is precisely what makes it a truthful
instance of "unknown to Google", confirmed against the live API before the run:

```
=== https://hellokahwin.com/artikel/does-not-exist/risk-05-probe-2026-08-27 → HTTP 200
      "verdict": "NEUTRAL",
      "coverageState": "URL is unknown to Google",
```

The alternative — a genuinely dark article — was not available: the four URLs
that were unknown yesterday morning all left that state within eight hours of
RISK-04 shipping.

**What stops this being a rigged test.** The probe is injected at the *sitemap
boundary*, before anything else runs, so it travels the identical code path a
real dark URL takes: inspection, grace window, assessment, issue body, issue
creation. There is no probe branch anywhere downstream. An alarm proved through
a special case proves only that the special case works.

It is stamped with an ancient `lastmod` so it occupies the state a URL reaches
after 72 dark hours, and it is **excluded from the persisted ledger** — a 404
will never be indexed, so persisting it would alarm every night forever. Proved:
the next run, with no probe, reported `alarm=false`.

## CLAIM 5 — it runs from the DEFAULT branch

**Evidence.** Before, GitHub refused the dispatch outright — blunter than the
silent failure the brief warned about:

```
HTTP 404: workflow indexing-monitor.yml not found on the default branch
```

After (`gh workflow list`):

```
DB backup freshness alarm       active  342253077
DB backup to R2                 active  342250539
Indexing monitor                active  343129988
```

```
$ git cat-file -e origin/master:.github/workflows/indexing-monitor.yml && echo YES
YES
$ git merge-base --is-ancestor 32e99e6 origin/master && echo YES
YES
```

Both proving runs above were dispatched `--ref master`. Schedule: `43 20 * * *`
UTC = 04:43 MYT, off the hour because the top of the hour is when GitHub's
scheduler is most congested, and two and a half hours clear of `db-backup.yml`.

---

## The thing that nearly went wrong, and what caught it

**`master` was three app commits behind production, and a normal push to it
would have reverted RISK-04 and RISK-06 in production.**

The brief said both had shipped and the CEO had verified them live. Both are
true. Neither had reached the default branch:

```
$ git cat-file -e origin/master:src/lib/seo/gsc-sitemap.ts
fatal: path 'src/lib/seo/gsc-sitemap.ts' exists on disk, but not in 'origin/master'
```

A build of the old master tip printed `/sitemap.xml  1h  1y` — the year-long
stale window RISK-06 removed. Production was serving
`stale-while-revalidate=3000` at that moment. The latest Production deployment
was `a9464a6`, a commit that has never been on master.

What caught it was the standing rule already written down at
`docs/boardroom/ceo-memory.md` — *"before merging anything to `master` on this
repo, compare `origin/master` HEAD against the commit live in Vercel production
via the deployments API"* — from RISK-01. It was written for the case where they
**match**. Today they did not, and the doctrine stopped at that sentence.

**What was done instead.** `[skip ci]` / `[vercel skip]` was tried first and this
project ignores it (deployment `6108555253` built and succeeded with both markers
in the message). So the monitor commit was based on **`a9464a6` — the exact
commit production was already running** — rather than on the stale master tip.
The tree that landed differs from production's own tree by seven files, none of
which any route imports:

```
$ git diff --stat a9464a6   # the master-bound commit
 .github/workflows/indexing-monitor.yml       | 306 +
 package.json                                 |   3 +-
 scripts/indexing-monitor.mts                 | 420 +
 src/lib/seo/__tests__/indexing-alarm.test.ts | 346 +
 src/lib/seo/gsc-auth.ts                      | 156 +
 src/lib/seo/gsc-url-inspection.ts            | 225 +
 src/lib/seo/indexing-alarm.ts                | 416 +
```

Gated before pushing: `pnpm typecheck` clean, `pnpm test` 296/296, `pnpm build`
green, and the build printed `/sitemap.xml  1h  1h` — confirming the tree
carries RISK-06's cap. Re-checked after: production still serves
`stale-while-revalidate=3000`.

**Scope note, stated plainly.** Landing on `a9464a6` carried three commits
belonging to other items (`7597ea9`, `92e2b51`, `a9464a6`) onto `master`. All
three were already live in production, so nothing new shipped to users and
master merely caught up with what was serving. It was the only route that met
the DoD without regressing production. **The residue is the owner's call:** the
five later commits on this branch are docs-only and were deliberately left
behind, and the divergence between "deployed" and "on master" is a /buildit
question, not an SEO monitor's to settle.

## Findings handed over, not fixed

**Six sitemap URLs are served with a `noindex` tag.** Google has crawled all six
and excluded all six. They are child-category hubs. This is not one of the DoD's
two alarm conditions, so the monitor **records** it and does not alarm on it —
but a sitemap that advertises noindex URLs is a permanent Search Console error,
and `src/app/sitemap.ts`'s own comment says the rule was supposed to prevent it.
Not fixed here: `src/app/sitemap.ts` and
`src/lib/inspire/category-indexability.ts` belong to another item, and the brief
is explicit that racing another item's file loses one of them silently.

Full list in `07-coverage-census-and-noindex-finding.txt`.

## What I cannot verify from outside

- **That the schedule will fire at 04:43 MYT.** No scheduled run has occurred
  yet; the workflow is registered `active` on the default branch and both proving
  runs were real runs there. What would verify it: a green run in the Actions tab
  tomorrow with `workflow_dispatch` absent from its trigger.
- **Whether pushing to `master` auto-deploys production.** Every historical
  master commit has a Production deployment within about a minute, which is why
  the push was treated as production-affecting. My own push produced no
  deployment in the six minutes I watched, so the correlation may be `/buildit`'s
  behaviour rather than Vercel's. I did not resolve it, because basing the commit
  on production's own tree made the question moot for this change. What would
  verify it: reading `productionBranch` from the Vercel project API with the
  `vercel.twn` token.

---

## Design decisions worth arguing with

**The 72h window applies to BOTH conditions, not just to "uncrawled".** An
article published four minutes ago is legitimately unknown to Google. Alarming
on it leaves the monitor permanently red, and a permanently red alarm is an alarm
nobody reads — the same outcome as no alarm, reached more expensively. URLs that
are dark but inside the window are reported every run as `watching`, so nothing
is hidden; there were 15 of them today.

**The window starts at `min(ledger firstSeen, sitemap lastmod)`.** With the
ledger alone, the monitor would be blind for its own first 72 hours and could not
have caught the five articles that motivated the item. `lastmod` is a sound lower
bound on age — `src/app/sitemap.ts` emits a truthful one and never writes
`new Date()` — and it only ever moves **forward** when an article is edited, so
the error is always in the direction of alarming *later*, never of fabricating an
alarm. A `lastmod` in the future is refused outright; it would otherwise buy a
broken URL an unlimited grace window.

**Blind is not clean.** A URL Google did not answer for is bucketed separately,
never counted as healthy, and fails the run with exit 2. The workflow then files
a differently-worded `monitor-blind` issue, because "the site has dark URLs" and
"the watchman could not see" have different fixes and must never be collapsed
into one issue. A monitor that quietly shrinks its own denominator and still
reports green is the exact failure this item exists to end.

**`coverageState` is localised prose, not an enum.** `languageCode: 'en-US'` is
pinned on every request, and `isUnknownToGoogle` *also* carries a structural
signature (`verdict NEUTRAL` + `indexingState`/`pageFetchState` both
`*_UNSPECIFIED` + no crawl) that survives a translation or a Google copy-edit.
Either half alone is one string change away from a monitor that reports a clean
sweep forever. Both halves stay.

**The judgement is a pure module.** `src/lib/seo/indexing-alarm.ts` takes `now`
as an argument and touches no network, clock or filesystem, so all 22 of its
tests run in milliseconds. A rule you can only exercise by waiting for tomorrow's
cron is a rule nobody reviews — and this item exists because an unreviewed
assumption went unchallenged for a sprint. The API shapes in those tests are
literal captures from the live API, not invented.

---

## Retrospective

**What we learned that is not written down.**

The rule *"committed is not shipped"* has a mirror image nobody had hit: **on
this repo, deployed is not on `master` either.** Production was three app commits
ahead of the default branch. The existing safe-merge check in `ceo-memory.md`
compares master against the live production commit — but it only says what to do
when they **match** ("the merge deploys nothing new"). It is silent on the case
that actually occurred, and the naive reading of silence is "push anyway", which
would have reverted two fixes the CEO verified live four hours earlier. The
missing half of the rule is the deliverable of this retro.

Second, smaller, and equally undocumented: **`[skip ci]` and `[vercel skip]` do
nothing on this project.** A preview build was spent finding out.

**Which document must change, and who owns the edit.**

`docs/boardroom/ceo-memory.md` — the standing-doctrine file, owned by the CEO
agent. The RISK-01 section's *"Safe-merge check worth reusing"* bullet gains the
branch it is missing. **The edit is made below.**

**What we did twice.**

Ran the production build twice on the same tree. The first run failed with
`ChunkLoadError` and `Invalid regular expression` in a `node_modules` chunk, on a
cold turbopack cache in a brand-new worktree. Rather than trust either result, a
control build of unmodified `origin/master` was run — it passed — and then the
same commit was rebuilt on a clean `.next` and passed too. Three builds to
establish one fact, but the alternative was pushing to a production branch on a
build result that could not be reproduced. Worth the time; the lesson is that a
first turbopack build in a fresh worktree is not evidence.

**What we nearly shipped, and what caught it.**

Two things.

*A production regression.* Caught by the standing safe-merge rule in
`ceo-memory.md`, followed by the two independent checks that make it concrete:
`git cat-file -e origin/master:<a file the work added>` — the brief's own test —
and a live header fetch showing `stale-while-revalidate=3000` against a master
build printing `1y`. Neither check on its own was conclusive; together they were.

*A silently narrower monitor.* The first draft treated a failed inspection as an
absent result and would have reported a clean sweep over a smaller denominator —
literally the SEO-01 failure re-implemented one layer up, and it would have
looked green forever. The pure-module split is what exposed it: writing
`assessSweep` as a function with a testable return type forced the question "what
bucket does a failed inspection go in?", which the imperative version never
asked. `blind` and exit code 2 exist because of that question.

**One more, on the shape of the work.** The auth flow was extracted into
`gsc-auth.ts` so there would be one token path, not two. That refactor then had
to be split into its own commit and left on the branch, because the file it
de-duplicates has not reached `master`. The de-duplication is therefore *pending*,
and a warning block at the top of `gsc-auth.ts` says so in the imperative, so
that whoever lands RISK-04's branch is told to finish it rather than discovering
two copies later.
