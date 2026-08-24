# Done: Fix P1, verify the AI tag, report the two unverifiable items

**Task:** Brief `aug-24-2026-brief-fix-p1-pillar.md`
**Engineer:** full-stack-engineer · **Date:** 24 Aug 2026 (~00:45–01:10 MYT)
**Status:** Diagnosed and verified. **No production write was made — none was needed.**

---

## Headline

**P1 was never broken in the database.** The row is present and correct. The
404 came from the read layer caching a "not found" answer and keeping it. P1
has been serving **200** throughout this investigation, including on a forced
cache miss.

There is a **real, still-live defect** behind it, and it is a code fix, so it
is yours to authorise: `/artikel/[category]` permanently caches a miss, and the
app's own cache invalidation is passing an argument that does not purge.

I also **reproduced the 504** and found it is not a one-off.

---

## Task 1 — P1 `nikah-undang-undang`

### It resolves now

```
nikah-undang-undang          200
hantaran-mas-kahwin          200
ucapan-doa                   200
busana-pengantin             200
pelamin-kad-cenderahati      200
venue-perancangan            200
sebelum-nikah                200
--- children of P1
borang-pendaftaran-nikah     200
rukun-syarat-sah-nikah       200
```

Six consecutive requests to `/artikel/nikah-undang-undang`: `200` every time.
Forced past the CDN with a cache-buster, so a fresh function execution:

```
HTTP/1.1 200 OK
Age: 0
X-Vercel-Cache: MISS
X-Vercel-Id: sin1::iad1::mkbgl-...
```

The page renders real content, not an empty shell:

```
<title>Nikah &amp; Undang-undang | Inspire | HelloKahwin</title>
<h1 ...>Nikah &amp; Undang-undang</h1>
rel="canonical" href="https://hellokahwin.com/artikel/nikah-undang-undang"
name="robots" content="noindex, follow"
```

`noindex, follow` is correct and expected — the documented indexability rule
keeps a pillar out of the index until an article publishes beneath it. Same as
the other six.

### The row, field by field, against P2 as control

```
P1  id 8e20afff-8125-41fd-9e0c-e23816a8c10c  slug nikah-undang-undang
    pillar_code P1  is_pillar true  parent_id null  display_order 1  wp_id null
    entity_phrase ✓  intro ✓  description ∅
    created_at 2026-08-23T16:02:32.953Z   updated_at 2026-08-23T16:02:32.953Z

P2  id 97473dfb-15ff-43bd-a215-4f9cd6fd6376  slug hantaran-mas-kahwin
    pillar_code P2  is_pillar true  parent_id null  display_order 2  wp_id null
    entity_phrase ✓  intro ✓  description ∅
    created_at 2026-08-23T16:02:32.953Z   updated_at 2026-08-23T16:02:32.953Z
```

**Identical in every respect that matters, down to the same seed timestamp.**
There is no published/visible flag on `inspire_categories` at all — the table
has 13 columns and none of them gate visibility. So: the seed did not skip P1,
did not write it wrong, and nothing downstream filters it on a field value.

### What actually produced the 404

`/artikel/[category]` has exactly one path to a 404
(`src/app/(public)/artikel/[category]/page.tsx:394-398`):

```ts
const category = await withDeadline(getCategoryBySlugCached(categorySlug), 3_000, ...);
if (!category) notFound();
```

and the lookup it depends on (same file, lines 30-41):

```ts
const getCategoryBySlugCached = unstable_cache(
  async (slug: string) => {
    const [cat] = await db.select().from(inspireCategories)
      .where(eq(inspireCategories.slug, slug)).limit(1);
    return cat ?? null;          // <-- a MISS is a cacheable value
  },
  ['inspire-category-by-slug'],
  { tags: ['inspire-categories'], revalidate: false },
);
```

`revalidate: false` is stored by Next as `CACHE_ONE_YEAR` (31,536,000s —
`next/dist/server/web/spec-extension/unstable-cache.js:27`). So **one request
for a slug that does not exist yet pins a 404 on that slug for a year**, and
each slug is its own cache key — which is exactly why P1 could be 404 while
P2–P7 were 200 in the same sweep.

A timeout cannot cause this: `withDeadline` rejects, which is a 500, not a 404.
The 404 is proof the cache returned `null`.

**Why it cleared without anyone touching the data.** Production was deployed
twice tonight:

```
2026-08-24 00:05:58   production  BLOCKED  hellokahwin-q724ufny9   (superseded)
2026-08-24 00:20:57   production  READY    hellokahwin-nymwp7tqo   <- hellokahwin.com
```

Your three attempts fall in the window served by the earlier deployment. The
00:20:57 redeploy is the most likely thing that dropped the poisoned entry.
I flag this as **inference, not proof** — I could not read the runtime logs
(see Task 3), and both deployment URLs sit behind SSO (302) so I could not
diff them directly.

### What is actually wrong, and why I changed nothing

Two code defects, neither a data problem:

**1. The category route caches its own misses.** The sibling article route
already solved this and documents the pattern
(`artikel/[category]/[slug]/page.tsx:198-205`):

> "Instead, throw so `unstable_cache` stores nothing — the next request
> re-attempts the full fetch"

`getCategoryBySlugCached` does the opposite. The narrow fix is to apply the
guard the neighbouring route already uses. **This is the fix I recommend.**

**2. The invalidation cannot clear it either.** Every call site — 30+ across
the admin actions, plus `/api/cron/revalidate-content` — passes `'max'`:

```ts
revalidateTag('articles', 'max');
revalidateTag('inspire-categories', 'max');
```

Reading the installed Next 16.1.6: `'max'` resolves to the built-in cache-life
profile `{ stale: 300, revalidate: 2592000, expire: 31536000 }`
(`config-shared.js:133-137`), and `revalidation-utils.js:120-129` passes that
`expire` straight to the cache handler. The same file states the alternative
outright:

> `// If profile is not found and not 'max', durations will be undefined`
> `// which will trigger immediate expiration in the cache handler`

So `'max'` sets a one-year expiry where an immediate purge was intended.
Next's own deprecation warning recommends `'max'`, which is how this was
written in good faith — but `updateTag(tag)` (server actions) and a bare
profile are what actually expire immediately. **Caveat:** the final step runs
inside Vercel's closed-source cache handler, so I am reporting what Next hands
it, not what Vercel then does with it.

Together these mean: **a slug curled before it exists stays 404 until the next
deployment.** That will bite again the first time an article or category is
requested before it is seeded — precisely the ingest workflow.

**Nothing was written to production.** The narrowest thing that is wrong is
code, not data, and per the brief that is your call.

---

## Task 2 — the AI authorship tag

### 2.1 Schema, defaults, constraints — verified on production

```
articles.authorship      USER-DEFINED  NOT NULL  default 'ai'::article_authorship
articles.review_status   USER-DEFINED  NOT NULL  default 'pending_review'::article_review_status
articles.reviewed_at     timestamptz   NULL      default —
articles.reviewed_by     text          NULL      default —

article_authorship      = ai, ai_assisted, human
article_review_status   = pending_review, reviewed, needs_changes
article_status          = draft, published, deleted
```

Both NOT NULL with the intended defaults: anything new is `ai` /
`pending_review` until a human says otherwise. That is the right default
direction — it fails safe toward "assume AI, assume unreviewed".

### 2.2 The 29 legacy WordPress posts — the count you asked for

```
origin                authorship  review_status    status      n    reviewed_at set
legacy (wp_id set)    human       pending_review   published   29   0
```

**29. All `human`. Zero marked `ai`. Zero carry a `reviewed_at`.**

That single row is the *entire* `articles` table — there are no other rows in
any combination. So the hand-ordered migration did exactly its job: not one
legacy post was back-stamped as AI-written, and no review that never happened
was recorded.

### 2.3 The admin UI — partially verified, and one item I could not do

What each filter would return, running the page's own conditions against
production:

```
?(no filter)                                          29
?authorship=human                                     29
?authorship=ai                                         0
?authorship=ai_assisted                                0
?review=pending_review                                29
?review=reviewed                                       0
?review=needs_changes                                  0
?source=ai-unreviewed                                  0
?source=ai-unreviewed&authorship=garbage (no widen)    0
```

The last line is the guard from `7e84a02` holding: a junk explicit param does
not drop the alias's constraint and widen the list.

Code paths confirmed by reading:
- Every row renders an authorship chip, `human` included — a chip-less row
  would be ambiguous (`articles-table.tsx:119`, `:820-824`).
- Two independent selects for authorship and review (`:499`, `:492`).
- The one-click chip calls `setReviewStatusAction(id, 'reviewed')` (`:384`),
  which sets `reviewStatus`, stamps `reviewedAt = new Date()` and
  `reviewedBy = user.id`, clears both on any non-reviewed status, writes an
  audit event, and deliberately does not bump `updatedAt`
  (`actions.ts:385-433`).

Tests covering this pass:

```
Test Files  2 passed (2)
     Tests  18 passed (18)
```
(`authorship-enums.test.ts`, `public-authorship-leak.test.ts` — the latter
asserts the authorship fields never reach a public route.)

**What I did not do: click through the live admin UI.** `/admin/inspire`
redirects to a Clerk sign-in, and admin auth is a strict Clerk + email
allowlist with no bypass (`lib/auth/admin.ts:134-151`). Signing in means
entering your credentials, which I will not do. This needs your session.

**Worth knowing before you check it:** production currently holds **zero `ai`
articles**. The AI badge cannot be observed on real data no matter who logs in —
every article on the site is a legacy `human` post. The badge, the AI filters
and the AI queue only become observable once the first article is ingested.

---

## Task 3 — the two things you could not verify from outside

### 3.1 The 504 — not a one-off, and I reproduced it

Sweeping 20 article URLs cold, one returned a live 504:

```
504 | idea-dan-nasihat/garden-wedding
```

The distribution around it is the real finding. Cold render TTFB, measured
with connect time separated out so this is server time, not my link:

```
5.851s  real-wedding/perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat
4.735s  idea-dan-nasihat/tempat-honeymoon-di-malaysia
4.255s  real-wedding/perkahwinan-di-ruma-hotel-kuala-lumpur...
4.230s  idea-dan-nasihat/hadiah-untuk-pengantin
4.208s  idea-dan-nasihat/wedding-planner-terbaik-di-malaysia
4.202s  moden-kontemporari/perkahwinan-romantis-di-jen-shangri-la-puteri-harbour
4.193s  pantai-santai/perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson
4.004s  moden-kontemporari/jw-marriott-kuala-lumpur
3.969s  real-wedding/yasaka-shrine
```

Against `export const maxDuration = 5`
(`artikel/[category]/[slug]/page.tsx:61`).

**Median cold render ~4.2s against a 5s hard ceiling.** That is roughly a 0.8s
margin. It is not a cold start that happened once — the cold path routinely
runs close enough to the limit that the slow tail crosses it, and the retry
succeeds because the second request hits the now-warm entry. That is precisely
the shape of what you saw: one 504, then three 200s.

Two honest caveats:
- One 20s and one 26s reading in my first sweep were **my own link**, not the
  site — the breakdown showed `time_connect` = 21.0s with TTFB 0.047s after
  connect. The 26.7s on the 504 was that same stall plus a real ~5s timeout.
  I am not counting those as site latency.
- The 5.85s page still returned 200, so Vercel's `maxDuration` is evidently
  counting execution and not cold-boot. The margin is therefore better than
  raw TTFB suggests — but a ~4.2s median cold render is still slow for a page
  whose data is one categorised article.

### 3.2 The function logs — I could not read them, and here is exactly why

The brief said check the logs rather than guess. I tried three ways and all
three are blocked, so the section above is measurement, not log evidence:

1. **REST API.** `/v1/deployments/{id}/runtime-logs` → 404, likewise
   `/v1/projects/{id}/logs` and `/v1/observability/runtime-logs`.
   Only `/v3/deployments/{id}/events` works, and it returns **build** events
   (119 of them, 00:20:58–00:22:01) — no request logs.
2. **Dashboard.** `vercel.com/thewednotebook/hellokahwin/logs` renders 404;
   the signed-in Chrome account is `ianng@playatbase.com`, which is not a
   member of the `thewednotebook` team.
3. **CLI live tail.** `vercel logs` in CLI v50 only tails *new* logs. I
   attached it (`Streaming logs for deployment dpl_BBeY4Y5jkUnsmhbg4VXRZ96LN8ce`)
   and drove eight uncached renders through it; nothing was emitted, because
   successful renders write no console output.

**To close this properly, one of two things:** add
`ianng@playatbase.com` to the `thewednotebook` Vercel team, or set up a log
drain. Right now this project is effectively unobservable in production, which
is a bad place to be the week you start publishing.

The build itself is clean apart from two warnings worth noting:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
Module not found: Can't resolve <dynamic>   ./src/lib/storage/pdf-compress.ts
```

### 3.3 The seed's final state — matches your authorisation exactly

```
total_categories               57
is_pillar                       7
has_pillar_code                33
created_by_seed                33
pre_existing_updated_by_seed     0
untouched                       24
```

**33 inserted, 0 updated, 24 pre-existing rows untouched.** That is the ~33 you
authorised, with zero collateral writes. The dry-run plan and the outcome agree.

---

## Also still true (re-checked, not assumed)

```
--- /dewan-kahwin/ ---
HTTP/1.1 308 Permanent Redirect
Location: /artikel/idea-dan-nasihat/dewan-kahwin
HTTP/1.1 200 OK
```

One hop. All seven pillars 200. Eight C2.4 articles **not published and not
ingested** — the `articles` table holds 29 rows and all 29 are legacy.

---

## What I recommend, in priority order

1. **Fix the negative caching on `/artikel/[category]`** — apply the guard the
   article route already documents. Small, and it removes the class of bug that
   produced tonight's 404. Needs a deploy.
2. **Fix the invalidation argument** in the same change. As it stands the
   ingest CLI cannot make its writes visible, which undercuts the ingest path.
   Both defects are one narrow PR through `/autopilot`.
3. **Get log access** (team membership or a drain). Everything in 3.1 is
   inference from measurement because of this.
4. **Raise `maxDuration`** on the article route, or cut the cold render cost.
   0.8s of headroom is not enough.
5. Production still has **no recovery point** (`pitr_enabled = false`) —
   carried forward from the previous run, still open, still the biggest
   standing risk.

## Not done, deliberately

- No production write of any kind.
- The eight C2.4 articles remain unpublished and un-ingested.
- No deploy, no re-run of the deploy.
- Admin UI click-through — needs your Clerk session (see 2.3).
