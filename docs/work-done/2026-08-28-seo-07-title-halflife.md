# SEO-07 — a shipped title has a half-life

**28 Ogos 2026 · sprint 03 · seo track · owner BMAD**
Branch `feat/seo07-title-halflife` → PR #11 → `master` `2804a64`, deployed to
production 11:56 MYT. Follow-up `4e222d1`.

Evidence: `docs/work-done/2026-08-28-seo-07-title-halflife-EVIDENCE/`

---

## The mechanism, from source

`generateMetadata` in `src/app/(public)/artikel/[category]/[slug]/page.tsx`
ended with:

```ts
try   { pageData = await withDeadline(getArticlePageData(slug), 1_500, …) }
catch { return {} }
```

Three links, each verifiable:

1. **`{}` is not "no title". It is "inherit the parent's".** Next merges page
   metadata by walking the returned object's own keys —
   `for (const key_ in metadata)` in `mergeMetadata`
   (`next/dist/lib/metadata/resolve-metadata.js:167`, Next 16.1.6). An empty
   object contributes no `title` key, so nothing is merged and the parent's
   ALREADY-RESOLVED title survives untouched: the root layout's
   `title.default`, `HelloKahwin — Idea & Panduan Perkahwinan Malaysia`. The
   homepage's title, printed on a wedding guide.

2. **It lands in the page's cache entry.** Metadata is rendered as part of the
   same RSC tree as the page (`createMetadataComponents` in
   `next/dist/server/app-render/app-render.js`), so the resolved `<title>` is
   stored in the same incremental-cache entry the page body is. `pnpm build`
   marks the route `● (SSG)`.

3. **So one unlucky render publishes it to everyone.** Not to the one request
   that lost the race — to every subsequent reader and to Googlebot, until that
   entry is replaced. The entry's own life is `Cache-Control: s-maxage=600,
   stale-while-revalidate=3000` at the origin and
   `Vercel-CDN-Cache-Control: s-maxage=300, stale-while-revalidate=600` at the
   edge. Each background revalidation re-rolls the same dice.

That is the half-life the Sprint 02 retro described, and why the CEO's
verification was a false pass rather than a mistake: the title WAS correct at
59 characters when checked. It was the site default again fourteen minutes
later, because a revalidation lost the race and re-froze the shell.

There was a second, quieter door to the same place, with no deadline involved.
`stripBrandSuffix` legitimately returns `''` for stored `meta_title` values of
`"HelloKahwin"` or `"| HelloKahwin"` — both real WordPress-import shapes — and
`resolveTitle` treats an empty title as falsy and falls back to the root default
(`next/dist/lib/metadata/resolvers/resolve-title.js:17`). It is now closed by
`resolveArticleTitle` and pinned by a test.

## The defect, reproduced deliberately

Production, old code, 28 Ogos 2026, 03:19–03:22 UTC. A SEQUENTIAL sweep — one
request at a time, 300ms apart — found 8 of 86 article pages serving the
site-default title. Seven of them answered `x-vercel-cache: MISS`: a cold origin
render, triggered by my own single request.

Twenty-six seconds later, the same eight URLs
(`EVIDENCE/02-frozen-shell-refetch.md`):

```
HIT    age=154   /artikel/ucapan-doa/ucapan-pengantin-baru
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=128   /artikel/hantaran-mas-kahwin/barang-hantaran-perempuan
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=130   /artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-lelaki
         <title> Hantaran tunang untuk lelaki: apa yang dibalas dan harganya | HelloKahwin
```

Seven `HIT`s with an `age` counting up: the wrong title is no longer being
computed, it is being served from cache. The third line is the item in one row —
that URL was the only one of the eight that answered `STALE` during the sweep,
its background revalidation happened to WIN, and so it recovered on its own.
Same URL, same minute, same code, opposite outcome.

Four of the eight were in `hantaran-mas-kahwin` — the family SEO-05 repaired.

## The count, and its method

**The count was never a fixed property of the corpus, which is why 39 and 3 were
both answers to the wrong question.** It is an accumulating failure rate: every
cold render rolls the dice, and every loss is then frozen.

Measured with `pnpm audit:titles` (`scripts/audit-rendered-titles.mts`, new in
this item — sequential by construction, 300ms apart, verdict is an exact string
match against the root `title.default` imported from
`src/lib/seo/site-title.ts` rather than copied):

| | old code, 03:19Z |
|---|---|
| article pages in the sitemap | 86 |
| serving no article title | **8** |
| — already frozen (`STALE`, age 510) | 1 |
| — created by my own single cold request (`MISS`) | 7 |
| cold (`MISS`) renders during the sweep | 75 |
| **cold-render failure rate at concurrency ONE** | **7/75 = 9.3%** |
| cold renders that KEPT their title | median 1,332ms, max 3,083ms |
| cold renders that LOST it | 2,457ms – 4,190ms |

The last two rows are the finding underneath the finding. The 1.5s metadata
deadline was described in the code as protection against a stalled database. It
is not: it fires on an ordinary slow render, roughly one cold render in eleven,
with nothing else touching the site.

36 of Sprint 02's 39 were manufactured by a six-wide sweep. This one is one-wide
and still finds 9.3%, so the concurrency was an amplifier, not the cause.

## The fix

Three tiers, in the new `src/lib/seo/article-metadata.ts`:

1. **The shared full payload.** Unchanged, same 1.5s ceiling. The React
   `cache()` wrapper still collapses `generateMetadata` and the page component
   to one fan-out, so the happy path costs exactly what it cost before.
2. **On deadline, a cheaper source.** `getArticleMetadataFallback` — one indexed
   row with the metadata columns only: no `content` JSONB, no tags query, no
   secondary-categories query, no `resolveDynamicBlocks`, no `media` join. It
   runs ONLY after tier 1 has already failed, so it adds zero queries to the
   5-wide pool in steady state, and it has its own `revalidate: false` cache
   entry carrying the same tags — once filled it answers without a database
   trip at all.
3. **If that misses too, the slug.** `titleFromSlug` reads
   `berapa-dulang-hantaran-tunang` back as `Berapa dulang hantaran tunang`. No
   I/O, no deadline, no failure mode.

The invariant, pinned by `src/lib/seo/__tests__/article-metadata.test.ts`: **no
path through this module returns metadata without a title.** That is a property
of the code, not of how fast the database answered — which is the whole
difference between this and what shipped before.

### Tier 3 was a `throw` first, and the measurement killed it

The obvious tier 3 was to throw: an errored render caches nothing, so the next
request re-attempts. Under a forced 1ms/1ms timeout that is USUALLY what
happens — `500`, nothing cached, then a correct `200`. Usually. One run in the
same session answered:

```
HTTP/1.1 200 OK   x-nextjs-cache: MISS   x-nextjs-prerender: 1   Content-Length: 145313
<h1>    Barang hantaran perempuan: senarai ikut kategori dan kos
<title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
```

The whole article, a correct `<h1>`, the root title in the head, and
`x-nextjs-prerender: 1` — that entry was being written. The exact defect,
straight back, through Next's own error path instead of through our `catch`.

It was not reproduced on demand, and that is the point. Next 16 decides PER
REQUEST whether to stream metadata or block on it, from the user agent
(`serveStreamingMetadata`), so the unwind path after a throw is not even the
same for a reader and for Googlebot. An invariant this item exists to guarantee
cannot rest on that. The slug turns "the site default is unlikely" into "the
site default is unreachable".

### Proof under a forced timeout

The deadlines are environment-tunable (`INSPIRE_META_DEADLINE_MS`,
`INSPIRE_META_FALLBACK_DEADLINE_MS`, defaults 1500/1200), read at module scope
so nothing here makes the route dynamic. Setting one to `1` makes that tier lose
deterministically — the condition is in the claim, so anyone can rerun it.

Local production build against the production database,
`INSPIRE_META_DEADLINE_MS=1`, Googlebot UA, ISR cache deleted first
(`EVIDENCE/03-forced-timeout-local.md`):

```
/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
  cold   http=200  cache=MISS
    <title> Berapa dulang hantaran tunang, dan siapa yang tentukan | HelloKahwin
  cache  http=200  cache=HIT
    <title> Berapa dulang hantaran tunang, dan siapa yang tentukan | HelloKahwin
```

The response under a forced timeout carries the real title and the real
description, and so does the cache entry written from that render. Under the old
code this exact condition produced the homepage title, cached.

With BOTH tiers forced to miss, the same URL serves `Sentosa janda baik |
HelloKahwin` — degraded, cached, and never the homepage.

## After the fix, on production

Full sequential sweep, 03:59–04:04Z, on the deploy's cold caches — every entry
in the corpus was `MISS`, which is the worst condition the site ever sees:

```
# ALL sitemap URLs: 103
#   article-title : 97
#   slug-title    : 6   <- degraded: both DB reads missed
#   site-default  : 0   <- serves NO article title
```

**`site-default: 0`.** The answer to "how many pages serve no article title" is
zero, on the whole corpus, measured sequentially.

Five article pages (one of the six was `/artikel`, a false positive in my own
classifier, fixed in `4e222d1`) degraded to tier 3. Their renders took
4.9–6.1s: on a corpus where every page AND every tier-2 cache entry was empty at
once, both reads genuinely missed. That is the fix behaving as designed at its
worst, and it is visible — in the audit as `slug-title`, and in the logs as
`[inspire-article-meta:<slug>] degraded to tier=slug`. The old code's failure
mode at the same moment would have been eight-plus pages carrying the homepage
title, silently.

### The 30-minute cold re-fetch — the measurement this item turns on

Verifying a title immediately after a deploy is the false pass SEO-07 is named
after. So: **04:43:15Z, 39 minutes after the sweep and 2h47m after the deploy**,
the same eight URLs the old code was serving the site-default title on. Edge
entries live at most 15 minutes, nothing had touched these URLs for 39, so
`x-vercel-cache: MISS, age=0` is a genuine cold fetch through to the origin —
the exact condition that produced 7 site-default titles on the old code.

Quoted literally (`EVIDENCE/06-cold-refetch-30min.md`):

```
/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
  http=200  x-vercel-cache=MISS  age=0
  <title> Berapa dulang hantaran tunang, dan siapa yang tentukan | HelloKahwin

/artikel/hantaran-mas-kahwin/barang-hantaran-perempuan
  http=200  x-vercel-cache=MISS  age=0
  <title> Barang hantaran perempuan: senarai ikut kategori dan kos | HelloKahwin

/artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-perempuan
  http=200  x-vercel-cache=MISS  age=0
  <title> Hantaran tunang untuk perempuan: apa yang dibawa masuk | HelloKahwin

/artikel/ucapan-doa/ucapan-pengantin-baru
  http=200  x-vercel-cache=MISS  age=0
  <title> Ucapan pengantin baru: apa yang ditulis ikut siapa dia | HelloKahwin

/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak
  http=200  x-vercel-cache=MISS  age=0
  <title> Kain songket tenunan tangan atau cetak: beza dan harga | HelloKahwin
```

**Eight of eight carry their article's own title. Zero carry the site default.**

And the five that were serving a tier-3 SLUG title at 04:04Z all now serve the
full row title — `Barang hantaran perempuan` has become `Barang hantaran
perempuan: senarai ikut kategori dan kos`. The degraded tier is transient by
construction: the next revalidation that wins replaces it, which is the exact
opposite of the old fallback, whose whole problem was that it did not decay.

Two method errors in that run are recorded in the evidence file rather than
tidied away — a `?_t=` "cache-buster" that Vercel ignores on this route, and a
failed request that reported the previous URL's title because the script reused
a stale file. Both are the same shape as the Sprint 02 sweep error, both are
fixed in `cold-refetch.sh`, and the claim above rests on the plain pass and the
elapsed clock, neither of which depends on either bug.


## What did NOT change, and why

- **The 1.5s tier-1 deadline.** It is doing a real job — bounding metadata
  against `maxDuration = 5` — and lengthening it trades a title problem for a
  timeout problem. The fix is a second source, not a longer wait.
- **Cold-render cost.** The five tier-3 degradations are a symptom of a 5-6s
  cold article render against a 5-wide pool. That is Sentry TWN-NEW-47's
  territory and the deferred `generateStaticParams` problem, whose conditions
  for a future attempt are documented on that function. Out of scope here, and
  named below as the follow-up.
- **`robots.index` in the emergency tier stays `true`.** A degraded title is
  replaced on the next crawl; a `noindex` frozen into a cache entry by exactly
  the mechanism this item is about is how a page leaves the index. Never trade a
  title problem for an indexing one. Pinned by a test.

## What this item found but did not fix

**`catch { return {}; }` also lives in two other `generateMetadata` functions**,
found by auditing every one in `src/app`:

- `src/app/(public)/artikel/author/[slug]/page.tsx:43`
- `src/app/(public)/artikel/tag/[slug]/page.tsx:126`

Same mechanism exactly — a 3s deadline, and on miss the archive page inherits
the homepage title and freezes it, both routes being `export const revalidate =
false`. Neither is in `sitemap.xml` (0 of 103 URLs), so neither is covered by
this item's sweep or its numbers.

**I did not change them, deliberately.** The fix is not the one line it looks
like. Both files carry a documented, deliberate SEO trade-off directly below
that line — a SECOND `catch` that returns `{ title: 'Not Found' }` on purpose,
because "briefly 404'ing a real tag during a DB blip is the safer failure mode
for SEO" than flushing a full head and locking a 200 into a soft 404 (~208 tag
URLs were in the GSC Soft 404 bucket when that was written). Making the first
`catch` consistent with the second means either freezing a `Not Found` title
onto a healthy archive page, or inventing a third behaviour — a real decision
about somebody else's reasoned trade-off, and not one to make quietly inside an
SEO-07 branch.

Owner: head-of-seo-content, as a sprint item of its own. It is small, it is the
same defect, and it now has a file and a line number.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**A count can be a property of the measurement rather than of the system, and
"re-measure more carefully" does not fix that — you have to change what you are
counting.** Sprint 02 asked "how many pages are broken", got 39, corrected it to
3, and recorded that the true number was unknown. Both numbers were answers to a
question the system cannot answer, because the corpus has no stable count: every
cold render rolls a 9.3% chance and freezes the result. The measurable quantity
is the RATE and the freeze window. The sweep now reports the cache state on
every row precisely so the next reader can tell the two apart.

**And: `{}` was never "no opinion".** In Next's merge model an empty object is
an instruction to inherit, and what it inherits is the homepage's title. Any
`return {}` from a `generateMetadata` on this site is a page quietly claiming to
be the homepage.

I audited every `generateMetadata` in `src/app` for the same line. **Two more
routes still have it**, and they are reported here rather than fixed — see
"What this item found but did not fix" below.

### 2. Which document must change, and who owns that edit?

Three, and I have made all three in this branch:

- **`src/lib/seo/site-title.ts`** (new) — owner: whoever owns SEO surfaces
  (head-of-seo-content). The root title existed as a string literal in
  `src/app/layout.tsx` and as COPIES in anything that wanted to detect it. A
  copied constant is a measurement that silently stops measuring: reword the
  homepage title and the audit reports a clean sweep on a corpus that is still
  broken. The layout, the sweep and the test now import one definition.
- **`.prettierignore`** — owner: whoever owns the repo's gates. `pnpm lint` has
  been RED on `master` since 27 Aug on seven committed evidence files Prettier
  cannot parse. `docs/work-done` is now ignored, because evidence is a record,
  and the four source files that red gate was hiding are reflowed. `pnpm lint`
  exits 0.
- **`scripts/audit-rendered-titles.mts`** (new) — owner: head-of-seo-content.
  The method that produced the number, committed next to the number, with the
  reason `--concurrency` is not an option on it written into the file.

### 3. What did we do twice that we should never repeat?

**Ran a blanket formatter over a repository to fix a handful of files.**
`pnpm lint:fix` is `eslint . --fix && prettier --write .`; run to format one
route file, it rewrote 117 files, including three prior sprints' `-EVIDENCE`
directories. Rewriting the record of what was measured is not a formatting
change. Every one of those was reverted, and `.prettierignore` now protects
`docs/work-done` — but the deeper cause was the permanently-red gate that makes
`lint:fix` feel like the normal way to work. Format the files you touched.

**And verified a title immediately after a change.** I did it once myself:
checking the eight pages ninety seconds after the deploy landed, on caches so
cold that one of them was serving a tier-3 slug title. An immediate check is the
false pass this item is named after. The measurement that counts is the 04:43Z
cold one, 39 minutes later.

**And built a knob that did not do what its name said.** The `?_t=` pass in
`cold-refetch.sh` was supposed to bypass the Vercel edge; Vercel ignores the
query string in this route's cache key, so it measured the entry the previous
pass had just created and reported `HIT` on every row. Sprint 02's six-wide
sweep was the same error in a different costume: a parameter that looks like it
changes the measurement, does not, and yields a confident number either way.
Both are now written into the scripts that carry them, because the only defence
is that the next person reads what the knob actually does before trusting it.

### 4. What did we nearly ship, and what caught it?

**A fix whose central guarantee was decorative.** Tier 3 was a `throw`, on the
reasoning that an errored render caches nothing, and the unit test for it was
green: `rejects.toBeInstanceOf(MetadataUnavailableError)`. What caught it was
refusing to accept the unit test as the proof and forcing the timeout against a
real production build — where one run in a dozen served 200, the full article,
and the root layout's title, with the prerender header set. A test that asserts
a function throws cannot tell you what the framework does with the throw. The
design changed to something that cannot be undone downstream: a title computed
from a route parameter.

The follow-up this item does not own: **cold article renders cost 4.9–6.1s
against a 5-wide pool**, which is what pushes both metadata tiers past their
deadlines at once. Every tier-3 degradation is a symptom of it. It belongs with
the deferred `generateStaticParams` work, whose conditions for a future attempt
are already recorded on that function in `page.tsx`.
