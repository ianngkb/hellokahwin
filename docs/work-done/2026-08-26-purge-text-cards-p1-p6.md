# The eight cards were live. The other nine were one ingest away, and that was the real exposure.

26 Ogos 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-purge-text-cards-p1-p6.md` (docs repo)
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo record:** `docs/work-done/2026-08-26-purge-text-cards-p1-p6-UNDO.md` + `…-UNDO.sql` — written, and machine-verified against the live rows, before the first write.
**Evidence:** `docs/work-done/2026-08-26-purge-text-cards-p1-p6-EVIDENCE/` — before/after live-HTML image lists, both sweeps, the ingest transcript, and every script that produced a number in this log.

Eight indexed articles under `/artikel/nikah-undang-undang/` and
`/artikel/venue-perancangan/` were serving a typographic `kad-tajuk` card in the
body — the cover that was displaced there when the covers were swapped to
photographs on 25 Aug. All eight are gone. **No URL changed. No prose changed.
No publish date moved. Nothing was put in their place. No PNG was deleted.**

**56 of 56 live articles now serve zero text cards**, confirmed twice by fetching
every page.

## The brief's table was wrong in a way that mattered

The brief said so itself — *"derive the list from the data, do not trust my
table"* — and the divergence turned out to be the finding, not a nuisance.

**The table listed 17 cards across the eight articles. The data held 8.**

| | Brief's table | Actually live | Actually in the drafts |
|---|---|---|---|
| `borang-nikah` | `-dokumen`, `-sistem-negeri` | `cover-borang-nikah.png` | all three |
| `rukun-nikah` | `-wali-hakim` | `cover-rukun-nikah.png` | both |
| `syarat-sah-nikah` | `-lelaki-perempuan` | `cover-syarat-sah-nikah.png` | both |
| `lafaz-taklik` | `-ke-mana-perginya` | `cover-lafaz-taklik.png` | both |
| `harga-sewa-dewan-kahwin` | `-cover`, `-rm160`, `-jam-atau-sesi` | `-cover` only | all three |
| `checklist-kahwin` | `-cover`, `-garis-masa` | `-cover` only | both |
| `pakej-dewan-kahwin` | `-cover`, `-syarat-katerer` | `-cover` only | both |
| `bajet-kahwin` | `-cover` | `-cover` | both |

Exactly **one card per article, always the displaced cover, always at body node
1**. The other nine were real files, really declared in the drafts, and **never
ingested** — so they had never reached a reader.

The file timestamps say why, and they are worth reading in order (MYT):

```
25 Aug 18:11–18:13   P1/P6 ingest runs. Live articles get photograph covers
                     and ONE displaced card each.
25 Aug 18:14–18:16   Seven more licensed photographs downloaded into drafts/images/.
25 Aug 18:45         NINE new kad-tajuk PNGs generated — after the ingest, and
                     after the "no text card at all" directive.
25 Aug 18:51–18:59   All eight drafts rewritten to declare the nine new cards
                     plus the new photographs. Never ingested.
```

So the live defect was eight cards; the **staged** defect was nine more, sitting
in the files that the next `--update` run would have published. The brief was
right that fixing the drafts prevents a reintroduction — it just had the
proportions backwards. **The drafts were the larger exposure, not the smaller
one.**

### The ninth article was not a ninth article

The brief names `C4-1-A2-songket-tenunan-tangan-atau-cetak.md` as carrying a card
and being unpublished. **Both halves are wrong**, checked against production:

- It has been **published since 25 Aug 10:45:05Z** and was live throughout this
  run — it is one of the 56 pages swept.
- It carries **no text card**. Its two `.png` entries are
  `images/S-menenun-songket-kelantan-1899-skeat.png` and
  `images/S-menenun-songket-alor-setar-british-official.png` — archival
  photographs, correctly declared under the `images/S-…` convention, which the
  brief's own rule exempts. An 1899 plate is a photograph that happens to be a
  PNG. Nothing was stripped from it.

## How a body card is actually found, because the obvious way cannot work

The first derivation returned **zero** `.png` references across all 56 articles,
which was wrong, and the reason it was wrong is the reason this defect survived a
day of audits.

Ingest stores a body figure's `src` as the WebP derivative:

```
inspire/borang-nikah/1787652677828-cover-borang-nikah/high.webp
```

There is no `.png` in it, and no `kad-tajuk` either. **`cover_image_url not like
'%kad-tajuk%'`, the query this workflow recorded beside the rule, cannot detect a
body card in principle** — not "did not", *cannot*. Neither can any pattern over
the served URL.

The card is only visible by resolving each `src` back to its `media` row and
reading the filename the article file declared. The classifier used throughout,
stated so it can be argued with:

```
text card  ==  media.filename ends .png  AND  media.filename !== basename(media.r2_key)
```

Ingest stamps every upload with `Date.now()`, so a file declared in an article
always ends up with a filename different from its key's basename. A WordPress
import carries the stamp *in* the filename, so for those the two are equal. That
distinction spares the two legitimate PNG populations — 16 legacy WordPress
photographs and screenshots across 5 old articles, and the songket plates — and
catches every generated card. It was checked against the whole 747-row `media`
table before being trusted.

## The drafts could not be the ingest source, and that turned out to matter twice

The obvious method — strip the cards from the drafts and re-ingest them — would
have published two things nobody asked for:

1. **CONT-02's staged batch.** `aug-25-2026-brief-cont-02-image-enrichment.md` is
   explicit: *"Find the images, write the alt text and captions, update the
   drafts… **Do not ingest.** RISK-01 (a production recovery point) is open and
   nothing writes to production until it closes."* Twelve photographs sourced
   after the P1/P6 publish were sitting in those drafts under that hold.
2. **The nine unpublished cards**, which were still declared at the time the run
   started.

Both would have ridden along inside a run whose brief says *images only, remove,
replace with nothing*. So the production write was made from **reconstructed
files** — `.tmp-textcard-purge/ingest/`, one per article — built from the **live
document**, not from the draft:

- prose body copied verbatim from the draft (verified byte-equivalent to the live
  document first, see below);
- `images:` set to exactly the figures the live page already carried, minus the
  card, with `alt`, `caption`, `credit`, `creditUrl`, `licenseClass` and
  `licensorName` read out of the live `media` rows so the credit chain could not
  drift;
- `placeAfter` computed from the live figure's position among non-figure blocks.

Before committing anything, the composed result was compared against *live
content minus the card node*, canonicalised, block by block:

```
borang-nikah               MATCH  nodes 51 vs 51
rukun-nikah                MATCH  nodes 43 vs 43
syarat-sah-nikah           MATCH  nodes 44 vs 44
lafaz-taklik               MATCH  nodes 37 vs 37
harga-sewa-dewan-kahwin    MATCH  nodes 64 vs 64
checklist-kahwin           MATCH  nodes 34 vs 34
pakej-dewan-kahwin         MATCH  nodes 42 vs 42
bajet-kahwin               MATCH  nodes 46 vs 46

ALL EIGHT: the planned ingest reproduces live-minus-the-card exactly.
```

That decision paid off a second time, unplanned: **another session rewrote all
eight drafts at 00:29 while this run's ingest was executing** (00:31:51–00:33:09).
Had the drafts been the ingest source, this run would have published a file that
changed under it mid-run. It did not read them.

### The publish-date trap, found on the way

`scripts/ingest-article.mts:713` writes
`published_at = frontMatter.publishedAt ?? new Date().toISOString()` on update.
**No draft in `drafts/` carries `publishedAt:`.** A plain `--update --publish`
re-ingest of these eight would therefore have restamped eight indexed pages with
today's date, taking the JSON-LD `datePublished` and the sitemap `lastmod` with
it. The reconstructed files each carry the article's real `published_at`, read
out of the database; all eight verified unchanged afterwards. **The trap is still
armed for anyone who ingests those drafts** — written up in Stage 7, see the
Retrospective.

## The run

```
pnpm --silent ingest .tmp-textcard-purge/ingest/<file>.md --db "$DB" --commit --update --publish --revalidate-url https://hellokahwin.com
```

`pnpm --silent` throughout, never `pnpm run`; `$DB` read from `.env` into a shell
variable so the literal never appeared in argv. All eight dry-ran against
production first and reported `Images: N, every one credited` with no `.png` in
any list. All eight then committed, **exit 0**, each reporting *"Content caches
dropped — the article is visible on the site now."* No warnings, no retries.

`--publish` is not optional here and it is worth saying why: without it
`effectiveStatus` falls to `draft` (`ingest-article.mts:517`), which would have
unpublished eight live articles.

### Unreferencing, without deleting

The ingest only ever *inserts* `media_article_usage`, so after the write each
card still showed as "used by" its article in the admin library. The eight rows
were deleted by id — `media_article_usage` 728 → 720. **The eight `media` rows
survive, all eight R2 objects still return 200 (checked one by one), and all 17
P1/P6 card PNGs — the eight live ones and the nine staged ones — are still on
disk in `drafts/`, 17 of 17.** The owner banned their use, not their existence.

## Proof

### Per article, before and after, quoted from live HTML

Full lists in `…-EVIDENCE/before-after.txt`. These are the image slugs the
**page** serves, which includes sibling thumbnails from the related-articles
block — that is why photographs belonging to other articles appear.

```
/artikel/nikah-undang-undang/borang-nikah
BEFORE 16:27:54Z HTTP 200   CARD cover-borang-nikah.png · S-selepas-akad-raja-abd-kadir.jpg · +3 siblings
AFTER  16:42:48Z HTTP 200        S-selepas-akad-raja-abd-kadir.jpg · +3 siblings

/artikel/nikah-undang-undang/rukun-nikah
BEFORE  CARD cover-rukun-nikah.png · S-akad-nikah-masjid-azlan-dupree.jpg · S-pengantin-selepas-akad-azlan-dupree.jpg · +2
AFTER        S-akad-nikah-masjid-azlan-dupree.jpg · S-pengantin-selepas-akad-azlan-dupree.jpg · +2

/artikel/nikah-undang-undang/syarat-sah-nikah
BEFORE  CARD cover-syarat-sah-nikah.png · S-akad-tok-kadi-raja-abd-kadir.jpg · +2
AFTER        S-akad-tok-kadi-raja-abd-kadir.jpg · +2

/artikel/nikah-undang-undang/lafaz-taklik
BEFORE  CARD cover-lafaz-taklik.png · S-lelaki-menadah-doa-ahmad-ali-karim.jpg · +2
AFTER        S-lelaki-menadah-doa-ahmad-ali-karim.jpg · +2

/artikel/venue-perancangan/harga-sewa-dewan-kahwin
BEFORE  CARD C6-2-A1-…-cover.png · S-jamuan-kenduri-raja-abd-kadir.jpg · S-dewan-orang-ramai-perak-wiki-farazi.jpg · +3
AFTER        S-jamuan-kenduri-raja-abd-kadir.jpg · S-dewan-orang-ramai-perak-wiki-farazi.jpg · +3

/artikel/venue-perancangan/checklist-kahwin
BEFORE  CARD C6-2-A2-…-cover.png · S-kompang-gendang-johor-stress043.jpg · +3
AFTER        S-kompang-gendang-johor-stress043.jpg · +3

/artikel/venue-perancangan/pakej-dewan-kahwin
BEFORE  CARD C6-2-A3-…-cover.png · S-pasangan-dan-keluarga-pelamin-mohd-hasan.jpg · +3
AFTER        S-pasangan-dan-keluarga-pelamin-mohd-hasan.jpg · +3

/artikel/venue-perancangan/bajet-kahwin
BEFORE  CARD C6-2-A4-…-cover.png · S-keluarga-payung-kuning-mohd-hasan.jpg · +3
AFTER        S-keluarga-payung-kuning-mohd-hasan.jpg · +3
```

**The before-state was captured at 16:27:42–16:28:01Z, four minutes before the
first write** (16:31:51Z), from the same code path that produced the after-state.

### The eight URLs, first request after the write

Sequential, one shot each, 16:34:27–16:34:29Z:

```
borang-nikah              200  x-vercel-cache=HIT age=59  112624 bytes  PNG refs 0  noindex false
rukun-nikah               200  HIT age=56  110723  PNG refs 0  noindex false
syarat-sah-nikah          200  HIT age=53  103594  PNG refs 0  noindex false
lafaz-taklik              200  HIT age=49  103955  PNG refs 0  noindex false
harga-sewa-dewan-kahwin   200  HIT age=46  124905  PNG refs 0  noindex false
checklist-kahwin          200  HIT age=19   93302  PNG refs 0  noindex false
pakej-dewan-kahwin        200  HIT age=16  112280  PNG refs 0  noindex false
bajet-kahwin              200  HIT age=27  106977  PNG refs 0  noindex false

200 on first request: 8/8      total PNG references across all eight: 0
```

Every `age` is smaller than the elapsed time since that article's write, so each
of these is a post-write render, not a survivor. The only `.png` strings anywhere
in the HTML are `/favicon.png` and `hellokahwin-logo.png`.

### The sweep of every live article

All 56 published articles, sequentially, `2026-08-25T16:42:15Z–16:43:11Z`:

```
HTTP 200: 56/56
TEXT CARDS SERVED ANYWHERE: 0, across 0 articles
unmatched served stems (no media row): 0
```

The brief asked for 28; **there are 56 published articles, and all 56 were
swept.** The same sweep an hour earlier returned **8 across 8 articles** from the
same code — which is the only reason the zero above is worth anything.

Re-confirmed independently by the new audit script, database and live together:

```
DATABASE — 56 published articles audited
  text cards referenced:      0
  images missing credit data: 619
  images with no media row:   0
LIVE — 56 pages fetched sequentially
  non-200 responses:   0
  text cards served:   0
PASS — no published article references a text card.
```

### The database, before against after

```
slug                        nodes    figures  prose       published_at  status/review  title/meta
bajet-kahwin                47→46    1→0      IDENTICAL   kept          unchanged      unchanged
borang-nikah                52→51    1→0      IDENTICAL   kept          unchanged      unchanged
checklist-kahwin            35→34    1→0      IDENTICAL   kept          unchanged      unchanged
harga-sewa-dewan-kahwin     65→64    2→1      IDENTICAL   kept          unchanged      unchanged
lafaz-taklik                38→37    1→0      IDENTICAL   kept          unchanged      unchanged
pakej-dewan-kahwin          43→42    1→0      IDENTICAL   kept          unchanged      unchanged
rukun-nikah                 44→43    2→1      IDENTICAL   kept          unchanged      unchanged
syarat-sah-nikah            45→44    1→0      IDENTICAL   kept          unchanged      unchanged
```

`article_categories` unchanged at 16 rows (pillar + cluster on each).
`jsonb_typeof(content)` = `object` on all 56 rows, before and after.

## Two live wobbles, neither caused by the content change, both said out loud

**1. `checklist-kahwin` cached a degraded render.** The first post-write render
dropped the entire related-articles block — 1 image instead of 4, 93,302 bytes
instead of ~101,500 — and the CDN kept it. The cause is by design and documented
in the page itself: `startDeadlineBudget(4_000)` is a single 4-second budget
shared across every sequential read in the render, and the related-articles read
runs last, so it is the first thing dropped, silently, to `[]`. A forced
revalidate produced a *second* degraded render. The third recovered. The article
body, its cover and its own figure were correct throughout; only the sideways
link block was affected. **`revalidate-content` returning 200 does not mean the
page that got cached behind it is a good one.**

**2. One transient 502**, on `/artikel/ucapan-doa/doa-majlis-perkahwinan` — an
article this run never touched — during the first full sweep. It returned 200
with all three of its images on the next three requests, and 200 in the
confirming sweep. Recorded because a 502 that is not written down is a 502 that
gets rediscovered.

## What this run left behind, deliberately

- **10 duplicate `media` rows and 10 orphan R2 objects.** Ingest stamps every
  upload with a fresh `Date.now()` — correct, because overwriting bytes under
  `max-age=31536000, immutable` is unfixable for a year — so re-ingesting an
  article re-uploads its surviving images under new keys. `media` went 747 → 757.
  The superseded rows still carry `media_article_usage` links, so the admin
  library will show two generations of each photograph. Cost and clutter, not
  breakage, and cleaning it needs its own undo reasoning.
- **619 images with no `credit`/`license_class`/`licensor_name`**, every one a
  legacy WordPress import (`RW-…`, `IN-…`). Pre-existing, already the subject of
  the 682-item library audit, and untouched here. Now counted by a command
  instead of by hand.
- **The eight text cards themselves** — media rows, R2 objects, disk files, all
  intact and now unreferenced.

## The drafts: fixed, but not by this run

The brief required the nine draft files be fixed or the next ingest reintroduces
the cards. **They were already fixed when this run reached them** — another
session rewrote all eight P1/P6 drafts at 00:29:00 on 26 Aug, mid-ingest,
removing every card and swapping in further photographs. Verified rather than
assumed, file by file:

| File | `.png` entries now | Verdict |
|---|---|---|
| `drafts/borang-nikah.md` | 0 | card-free |
| `drafts/rukun-nikah.md` | 0 | card-free |
| `drafts/syarat-sah-nikah.md` | 0 | card-free |
| `drafts/lafaz-taklik.md` | 0 | card-free |
| `drafts/C6-2-A1-harga-sewa-dewan-kahwin.md` | 0 | card-free |
| `drafts/C6-2-A2-checklist-kahwin.md` | 0 | card-free |
| `drafts/C6-2-A3-pakej-dewan-kahwin.md` | 0 | card-free |
| `drafts/C6-2-A4-bajet-kahwin.md` | 0 | card-free |
| `drafts/C4-1-A2-songket-tenunan-tangan-atau-cetak.md` | 2 | both `images/S-…` archival photographs — not cards, correctly left |

All paths are under
`C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\plans\aug-23-2026-session-01\drafts\`.
The worktree branch has no `docs/plans/` at all, so there is no second copy of
these files to reconcile — except `drafts/ingest/C4-1-A2-…md`, which is the same
article with `../images/` paths and `status: published`; it has no card either
and was left alone.

**This run therefore edited none of the nine drafts.** Not because the work was
unnecessary, but because it was already done by somebody else while this run was
mid-flight — which is itself the file-conflict CONT-02's brief predicted in
writing (*"if you see article files changing under you, stop and tell me"*).
Telling them: the files changed at 00:29, this run's production write was made
from reconstructions and never read them, and the eight live articles and the
eight drafts now agree that there are no cards.

## Retrospective

**The question.** A directive was withdrawn, and the withdrawal reached one batch
but not another that had already been built the old way. What in the process
should catch *"a standard changed after this was built"*?

**The uncomfortable answer: the process already had that rule, in writing, and it
did not fire.** `aug-23-2026-workflow-content-production.md` gained a whole
**Standards loop** section on 25 Aug — backfill list, named owner, re-check after
the backfill, plus three sub-rules about mid-flight directives and withdrawn
directives surviving as citations in build artefacts. Every one of those was
already on disk while eight indexed pages served a text card in the body. So
"write down that standards need a backfill" is not the missing piece. It was
there. Proposing it again would be the third time.

**What actually failed is one line inside that rule.** The loop says *"record the
query beside the rule"*, and the query that got recorded was:

```
cover_image_url not like '%kad-tajuk%'
```

The directive has two clauses — *not as a cover, and not in the body*. That query
covers one of them. It ran, it came back clean, and the run reported **"25 of 25
photograph covers, zero text cards"** — a sentence that is true about covers and
false about pages. **The check was narrower than the rule it was recorded
against, so passing it closed the question.**

And it is worse than narrow. Aimed at the body, that pattern still returns
nothing, forever, because ingest stores figures as `…/high.webp`. **A check that
cannot in principle observe the thing it forbids does not merely miss the defect
— it manufactures evidence of compliance**, and that evidence is what let the
covers-only audit be written up as a clean result.

### The file that should carry the check, and the edit

**`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`** —
the process spine, and the file that already owns the Standards loop. Edited in
two places:

1. **New sub-section, `#### The recorded check must cover the WHOLE standard, and
   must be proven to fire`** (inside the Standards loop, immediately after the
   "write the standard so it can be queried" paragraph that produced this
   failure). Three rules: enumerate the check clause by clause against the
   standard and name the column under each clause; **point the check at a known
   bad instance and watch it go red before trusting a green**; and derive the
   population from the data, never from a brief's table — with this run's own 17
   versus 8 as the worked example.

2. **New bullet in `#### The run, exactly`** (Stage 7), for the publish-date trap
   this run found: re-ingesting a live article without `publishedAt:` in the file
   moves its publish date to now, and **no draft carries that field**. Anyone
   ingesting the eight P1/P6 drafts today restamps eight indexed pages.

### And the check itself, because a rule nobody can run is what failed last time

**`scripts/audit-live-images.mts`** (site repo), wired as
`pnpm --silent audit:images --db <url> [--live]`, added to `package.json`. It
walks every published article's `content` document, resolves every `src` back to
its `media` row, classifies text cards by **declared filename** rather than by
served URL, checks cover **and** body, optionally re-fetches all 56 live pages
sequentially, reports missing credit fields, and exits non-zero on any card.

It was written before the fix and **run against the before-state, where it
returned 8 across 8 articles.** That is the point of rule 2 above, and it is the
only reason its `PASS` at the end of this run means anything. Passes lint,
prettier and typecheck.

**The honest limit of all this.** Nothing above would have caught the nine staged
cards, because they live in draft files rather than in the database, and this
audit only sees what is published. The thing that caught those was reading the
drafts against the live rows and noticing the counts disagreed — a human-shaped
act. The register gate in the Standards loop (`status_guna: jangan-guna`) is the
existing mechanism meant to cover it, and it did not stop nine new cards being
generated at 18:45 on 25 Aug and written into eight drafts six minutes later.
**That gap is still open, and it is a bigger one than the defect this brief was
written about.**
