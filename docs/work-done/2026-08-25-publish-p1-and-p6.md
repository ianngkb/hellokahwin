# P1 and P6 went live. Three pillars now, not one.

25 Aug 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-publish-p1-p6.md` (docs repo)
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo record:** `docs/work-done/2026-08-25-publish-p1-p6-UNDO.md` — written before the first write.

Eight board-cleared articles ingested into production Supabase and published.
Four into P1 `/artikel/nikah-undang-undang/`, four into P6
`/artikel/venue-perancangan/`. Both pillar hubs were `noindex` at the start of
the run because neither owned a published article; both own four now.

## What was decided before writing

### The cover-path convention: relative to the article file, no `./`

The brief warned that P1 used `images/S-….jpg` while "some P6 entries have used
a leading `./`". **Checked all eight files: no `./` appears anywhere.** Every
one of the 18 image references is already a bare relative path — a sourced
photograph as `images/S-name.jpg`, a HelloKahwin graphic as `name.png` beside
the article file. All 18 resolve on disk.

So the convention chosen is the one already in the files: **relative to the
article file, no `./` prefix.** The reason to prefer it over `./` is not
technical — `resolve(fileDir, './x')` and `resolve(fileDir, 'x')` produce the
same path, and the parser accepts both. It is that the difference had already
cost a review round without changing a single byte of output. Written down in
two places so it stops recurring (see Retrospective).

Nothing was rewritten. No image path was edited.

### The `articles.content` double-encoding bug: already fixed, and verified so

**Fixed by a previous run**, commit `12182d6` *"fix(ingest): stop writing jsonb
as strings, and serve figures the right bytes"*, logged at
`docs/work-done/2026-08-25-ingest-jsonb-double-encoding.md`. Two independent
checks before ingesting:

1. **The script.** All nine jsonb parameters in `scripts/ingest-article.mts` go
   through `sql.json()`; a source-level test asserts no `JSON.stringify` sits in
   a `::jsonb` parameter position.
2. **The database**, queried directly before the first write:

```
=== jsonb_typeof(content) census, whole table, 2026-08-25T10:08:44Z ===
[{"t":"object","count":"36"}]
```

Zero `string` rows. The eight C2.4 rows the brief describes as broken had already
been re-ingested. Nothing needed fixing, and this run did not touch them.

After the run, the same census plus every jsonb column on the eight new rows:

```
=== jsonb_typeof census, WHOLE TABLE ===
[{"t":"object","count":"44"}]

=== all jsonb columns on the eight new rows ===
{"slug":"bajet-kahwin","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"borang-nikah","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"checklist-kahwin","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"harga-sewa-dewan-kahwin","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"lafaz-taklik","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"pakej-dewan-kahwin","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"rukun-nikah","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"syarat-sah-nikah","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}

=== media jsonb on the 18 rows created by this run ===
[{"v":"object","s":"object","count":"18"}]
```

### Ingest order: no dependency existed

The brief expected the eight to cross-link to each other, making order
load-bearing. **They do not.** Every internal link — front matter and body,
extracted with the parser's own `bodyInternalLinks` regex — points at an article
that was *already* published:

```
borang-nikah.md              fm: kursus-kahwin, mas-kahwin-ikut-negeri   body: same two
rukun-nikah.md               fm: mas-kahwin-ikut-negeri                  body: same
syarat-sah-nikah.md          fm: kursus-kahwin                           body: same
lafaz-taklik.md              fm: (none)                                  body: (none)
C6-2-A1-harga-sewa-…​.md      fm: sewa-dewan-kahwin, dewan-kahwin         body: same two
C6-2-A2-checklist-…​.md       fm: kursus-kahwin, sewa-dewan-kahwin, hantaran-kahwin   body: same three
C6-2-A3-pakej-dewan-…​.md     fm: sewa-dewan-kahwin, majlis-kahwin        body: same two
C6-2-A4-bajet-kahwin.md      fm: kursus-kahwin, dewan-kahwin, goodies-kahwin        body: same three

=== all referenced slugs, resolved against production ===
  OK  dewan-kahwin        OK  goodies-kahwin   OK  hantaran-kahwin
  OK  kursus-kahwin       OK  majlis-kahwin    OK  mas-kahwin-ikut-negeri
  OK  sewa-dewan-kahwin
```

Seven distinct targets, all `status = published`, none of them one of the eight.
**No second link-patching pass was needed and none was done.** Order was chosen
for containment instead — P1 complete before P6 starts, so a mid-run failure
would leave one pillar consistent rather than two half-built:

```
1. borang-nikah        (C1.1)      5. harga-sewa-dewan-kahwin  (C6.2)
2. rukun-nikah         (C1.2)      6. checklist-kahwin         (C6.2)
3. syarat-sah-nikah    (C1.2)      7. pakej-dewan-kahwin       (C6.2)
4. lafaz-taklik        (C1.2)      8. bajet-kahwin             (C6.2)
```

All eight passed a dry run against production first. All eight then committed
with exit code 0.

## The command

```
pnpm --silent ingest <file>.md --db "$DB" --commit --publish --revalidate-url https://hellokahwin.com
```

`pnpm --silent` throughout, never `pnpm run` — the database URL is in argv and
the runner banner has leaked it into a transcript before. `$DB` was read out of
`.env` into a shell variable so the literal never appeared in a command line.
`--revalidate-url` on every one of the eight runs; each reported
*"Content caches dropped — the article is visible on the site now."*

## Proof

All requests below were taken **457 seconds after the last write** (last write
10:13:20Z, first proof request 10:21:04Z). Cache headers are recorded on every
one, because a stale 200 and a fresh 200 are otherwise identical.

### The eight new URLs — first request, one shot each

None of these URLs had ever been requested before, so `MISS` here is a genuine
cold render, not a re-served baseline.

```
URL:              https://hellokahwin.com/artikel/nikah-undang-undang/borang-nikah
AT (UTC):         2026-08-25T10:21:04.770Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       111196
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/nikah-undang-undang/rukun-nikah
AT (UTC):         2026-08-25T10:21:09.213Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       104058
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/nikah-undang-undang/syarat-sah-nikah
AT (UTC):         2026-08-25T10:21:13.220Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       102259
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/nikah-undang-undang/lafaz-taklik
AT (UTC):         2026-08-25T10:21:17.272Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       102547
ROBOTS META:      <meta name="robots" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"/>
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/venue-perancangan/harga-sewa-dewan-kahwin
AT (UTC):         2026-08-25T10:21:20.984Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       123208
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/venue-perancangan/checklist-kahwin
AT (UTC):         2026-08-25T10:21:24.835Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       99779
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/venue-perancangan/pakej-dewan-kahwin
AT (UTC):         2026-08-25T10:21:28.674Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       110615
ROBOTS META:      <meta name="robots" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"/>
NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/venue-perancangan/bajet-kahwin
AT (UTC):         2026-08-25T10:21:32.482Z
STATUS:           200
HDR x-vercel-cache: MISS      HDR age: 0
BODY BYTES:       105242
ROBOTS META:      <meta name="robots" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"/>
NOINDEX ANYWHERE IN BODY: false
```

**Eight for eight: 200, cold, no `noindex`.** Three of the eight emit an explicit
`index, follow` robots meta; the other five emit no robots meta at all, which is
the indexable default. The difference is Next's `generateMetadata` output, not a
difference between the articles, and neither form is `noindex`.

### `/artikel/nikah-undang-undang` — `noindex` is GONE

This URL **had** been requested before publishing, at 10:09:49Z, to capture the
before-state. That baseline is what the first proof request was served:

```
URL:              https://hellokahwin.com/artikel/nikah-undang-undang
AT (UTC):         2026-08-25T10:21:47.257Z
STATUS:           200
HDR x-vercel-cache: STALE     HDR age: 717
BODY BYTES:       31287
ROBOTS META:      <meta name="robots" content="noindex, follow"/>
NOINDEX ANYWHERE IN BODY: true
```

`age: 717` is longer than the 457-second wait — this is the pre-write copy my own
baseline stored, served stale-while-revalidate. It is not evidence about the
publish. The request that triggered the refresh returned it seventeen seconds
later:

```
URL:              https://hellokahwin.com/artikel/nikah-undang-undang
AT (UTC):         2026-08-25T10:22:04.628Z
STATUS:           200
HDR x-vercel-cache: HIT       HDR age: 16
BODY BYTES:       35804
ROBOTS META:      (no robots meta emitted — page is indexable by default)
NOINDEX ANYWHERE IN BODY: false
```

**`noindex` is gone.** Before: `<meta name="robots" content="noindex, follow"/>`.
After: no robots meta at all, and the string `noindex` does not appear anywhere
in the document. Body grew 31,287 → 35,804 bytes — the four article cards.

```
https://hellokahwin.com/artikel/nikah-undang-undang  status=200 cache=HIT age=27
  article links: total=4 unique=4
    /artikel/nikah-undang-undang/borang-nikah
    /artikel/nikah-undang-undang/lafaz-taklik
    /artikel/nikah-undang-undang/syarat-sah-nikah
    /artikel/nikah-undang-undang/rukun-nikah
```

### `/artikel/venue-perancangan` — `noindex` is GONE

Same shape, same cause, same outcome.

```
URL:              https://hellokahwin.com/artikel/venue-perancangan
AT (UTC):         2026-08-25T10:21:47.403Z
STATUS:           200
HDR x-vercel-cache: STALE     HDR age: 717
BODY BYTES:       29972
ROBOTS META:      <meta name="robots" content="noindex, follow"/>
NOINDEX ANYWHERE IN BODY: true

URL:              https://hellokahwin.com/artikel/venue-perancangan
AT (UTC):         2026-08-25T10:22:04.767Z
STATUS:           200
HDR x-vercel-cache: HIT       HDR age: 14
BODY BYTES:       33564
ROBOTS META:      (no robots meta emitted — page is indexable by default)
NOINDEX ANYWHERE IN BODY: false
```

```
https://hellokahwin.com/artikel/venue-perancangan  status=200 cache=HIT age=25
  article links: total=4 unique=4
    /artikel/venue-perancangan/bajet-kahwin
    /artikel/venue-perancangan/pakej-dewan-kahwin
    /artikel/venue-perancangan/checklist-kahwin
    /artikel/venue-perancangan/harga-sewa-dewan-kahwin
```

### `sitemap.xml` — 47 → 57

```
BEFORE  AT (UTC): 2026-08-25T10:09:49.508Z  STATUS: 200  SITEMAP <loc> COUNT: 47
AFTER   AT (UTC): 2026-08-25T10:21:47.453Z  STATUS: 200  SITEMAP <loc> COUNT: 57
        HDR x-vercel-cache: REVALIDATED   HDR age: 0
```

**Exactly the ten predicted:** the eight article URLs, plus the two pillar hubs
that were absent from the sitemap while they were `noindex`.

```
https://hellokahwin.com/artikel/nikah-undang-undang
https://hellokahwin.com/artikel/venue-perancangan
https://hellokahwin.com/artikel/nikah-undang-undang/borang-nikah
https://hellokahwin.com/artikel/nikah-undang-undang/rukun-nikah
https://hellokahwin.com/artikel/nikah-undang-undang/syarat-sah-nikah
https://hellokahwin.com/artikel/nikah-undang-undang/lafaz-taklik
https://hellokahwin.com/artikel/venue-perancangan/harga-sewa-dewan-kahwin
https://hellokahwin.com/artikel/venue-perancangan/checklist-kahwin
https://hellokahwin.com/artikel/venue-perancangan/pakej-dewan-kahwin
https://hellokahwin.com/artikel/venue-perancangan/bajet-kahwin
```

The clusters (C1.1, C1.2, C6.2) are correctly **not** added: an article's primary
category is its pillar, so a cluster owns no live article URL and stays out.

### The rendered credit line, quoted from live HTML

`/artikel/nikah-undang-undang/borang-nikah`, cover photograph — the credit is a
link to the source file on Wikimedia Commons, which is the whole point of the
`creditUrl` field:

```html
<a href="https://commons.wikimedia.org/wiki/File:Kahwin_-_panoramio.jpg" class="underline underline-offset-2 transition-opacity hover:opacity-80" target="_blank" rel="noopener noreferrer">Kredit: raja abd kadir (CC BY 3.0)</a>
```

And the in-article graphic, caption and credit joined by the en dash that
`creditLine()` inserts:

```html
<figcaption style="...">Borang 1 hingga 6 seperti disenaraikan dalam Pk. P.U. 30, Warta Kerajaan Negeri Perak, 1 Jun 2013. — Grafik: HelloKahwin</figcaption>
```

### Database, after

```
articles = 44   published = 44   media = 667   inspire_tags = 22
jsonb_typeof(content): [{"t":"object","count":"44"}]

P1  nikah-undang-undang    published = 4
P2  hantaran-mas-kahwin    published = 8
P6  venue-perancangan      published = 4
P3/P4/P5/P7                published = 0
```

Every one of the eight carries both its pillar and its cluster in
`article_categories`, which is what places it in the right section of the hub:

```
borang-nikah C1.1,P1   rukun-nikah C1.2,P1   syarat-sah-nikah C1.2,P1   lafaz-taklik C1.2,P1
harga-sewa-dewan-kahwin C6.2,P6   checklist-kahwin C6.2,P6
pakej-dewan-kahwin C6.2,P6        bajet-kahwin C6.2,P6
```

All 18 uploaded images return HTTP 200 from `images.hellokahwin.com`, and every
in-article figure `src` points at the `high.webp` variant rather than the
original — the fix from `2026-08-25-ingest-figure-src-and-placement.md` holding
on a second batch.

### Nothing else moved

```
=== the 36 pre-existing articles: any updated_at after the run started (10:11:16Z)? ===
(none — no pre-existing article row was touched)
```

The eight live C2.4 articles last changed at 09:11–09:26Z, before this run began.
No existing URL changed; the eight slugs were all new, and `--update` was never
passed.

## What was changed beyond a plain ingest

Two things, stated so nobody has to diff for them:

1. **`status: draft` → `status: published`** in the front matter of all eight
   files. Not an edit to article text — it is the publish-control field, and
   without it `--publish` inserts a draft and does nothing visible. Stage 6b
   hands articles over saying `draft`; flipping it is part of Stage 7.
2. **Documentation edits**, listed under the Retrospective below.

**No article text was edited. No image path was edited. No internal link was
retargeted.** The board-cleared text is what shipped.

## Retrospective

### 1. What did we learn that is not written down?

**`--revalidate-url` does not clear the cache that actually serves readers.** The
script's own message — *"Content caches dropped — the article is visible on the
site now"* — is true of the Next data cache inside the origin and false of the
Vercel edge in front of it. 457 seconds after the last write, past the 300s edge
TTL, `/artikel/nikah-undang-undang` still returned `x-vercel-cache: STALE`,
`age: 717`, `<meta name="robots" content="noindex, follow"/>`. Waiting is not
sufficient, because the first request past the TTL is the one that triggers the
refresh and is served the old copy while doing it. The second request, seventeen
seconds later, was correct.

`src/lib/cache/purge.ts` already documented this exact stale-not-expired shape
one layer in, for the Next data cache. Nothing said it repeats at the edge, or
that the edge is not purged by anything we run.

**Two smaller ones.** Publishing takes two keys — `status: published` in the file
*and* `--publish` on the command — and neither alone does anything; the failure
is silent, an inserted draft. And `media.original_article_id` is
`ON DELETE SET NULL`, not cascade, so an undo that deletes articles first strands
its media rows permanently.

### 2. Which document must change, and who owns the edit?

Three files. All three were edited as part of this run — the edits are done, not
proposed.

| File | Edit | Owner |
|---|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` (docs repo) | Stage 7 rewritten: the exact command, the two-key publish rule, `--revalidate-url`, the five-minute wait, the never-baseline-the-proof-URL rule, the undo requirement and its `SET NULL` trap, link-driven ingest order, and the image path convention | BMAD, this run |
| `src/lib/cache/purge.ts` (site repo) | New closing section on the Vercel edge as a second cache that `revalidateTag` cannot reach, with today's measured numbers and the two rules for taking proof | BMAD, this run |
| `src/lib/inspire/article-file.ts` (site repo) | `imageSchema.file` comment now states the one path spelling and why it is a convention rather than a validation | BMAD, this run |

### 3. What did we do twice that we should never do again?

**Baselined the URL whose after-state is the deliverable.** On 24 Aug the log
records it plainly: *"The edge handed back the copy my own baseline request had
caused it to store, and never asked the origin."* Today the same request was
taken again at 10:09:49Z, for the same good reason — to have a before-number —
and it poisoned the proof again in exactly the same way, down to the `noindex`
meta tag.

The eight article URLs are the control: never requested before publishing, and
every one came back `MISS` and correct on the first request. The before-state can
be had from the database and the sitemap, neither of which is edge-cached
per-URL. **Stop baselining proof URLs.** Now written into Stage 7.

Also done twice, more cheaply: re-deriving how to run ingest by reading
`scripts/ingest-article.mts` end to end. The flags were in a work-done log and in
code comments, nowhere in the workflow anyone follows. Stage 7 now carries the
command.

### 4. What did we nearly ship, and what caught it?

**A false failure report.** The pillar-page proof request returned 200 with
`noindex` still present. Reported as-is, that reads "the publish did not work" —
and the plausible next move is re-running the ingest with `--update` against
production, or worse, executing the undo. Both would have been destructive
responses to a publish that had already succeeded.

What caught it was recording `x-vercel-cache` and `age` on every proof request.
`age: 717` on a 457-second-old write is arithmetically impossible for a fresh
render, which is what identified the response as our own baseline rather than the
origin's answer. That habit came directly from
`docs/work-done/2026-08-24-production-proof-and-branch-filter.md`, which recorded
the same headers for the same reason a day earlier. **Keep the habit:** a status
code alone cannot tell you whether you are looking at your own echo.

Second, smaller near-miss: the brief said the eight cross-link to each other and
that ingest order was therefore load-bearing. Taken on trust, that would have
produced an elaborate ordering exercise for a dependency that does not exist.
Extracting the links with the parser's own `bodyInternalLinks` regex and
resolving every slug against production took two minutes and replaced the guess
with a list.

## Still open

- **The Vercel edge is still not purged at ingest time.** This run worked around
  it with a wait and a second request. Until an edge purge exists, every publish
  carries a window of up to 300s where readers and crawlers get the pre-write
  page, and any URL touched before the write carries it longer.
- **18 R2 objects are not covered by the undo.** Deliberate — see the undo
  record. They are orphans, not breakage.
- **All eight are `review_status: pending_review`**, as every ingested article
  is. They are live and in the owner's review queue at the same time; that is the
  designed behaviour, not an oversight.
- **Stage 8 measurement is not started.** `head-of-seo-content` checks these at
  14 and 45 days — 8 Sep and 9 Oct 2026.
