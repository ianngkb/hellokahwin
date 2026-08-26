# Done: a credited photograph on a live article

**Task:** Brief `aug-25-2026-brief-images-onto-live-articles.md`
**Date:** 25 Ogos 2026 · **Target:** production
**Status:** Complete, in three runs. Run 2 was authorised by the CEO after run 1
reported two defects. THREE of the eight live C2.4 articles now carry a sourced,
credited photograph; five are skipped with reasons. The jsonb double-encoding
defect is fixed in the script and corrected on all eight live rows. The leaked
internal SOURCE NOTES section is cut, and the other seven articles were checked
for the same leak and are clean. Read "Run 2" and "Run 3" at the foot of this
file — the sections above describe run 1 and stand as written.

---

## The deliverable

**https://hellokahwin.com/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin**

The photograph sits third in the body, under the definition and under the line
"Ia bukan hantaran, dan bukan duit hantaran". Its credit is on the image, and it
is a link to the file page the licence lives on.

Quoted from the live HTML, first request:

```html
<figcaption class="absolute inset-x-0 bottom-0 …">
  <a href="https://commons.wikimedia.org/wiki/File:Malay_couple.jpg"
     target="_blank" rel="noopener noreferrer">Kredit: Azlan DuPree (CC BY 2.0)</a>
</figcaption>
```

```
FIRST REQUEST  status=200  Age: 0  X-Vercel-Cache: REVALIDATED
```

## Which article got one, and why

**`apa-itu-mas-kahwin` — HK-P-0001, Azlan DuPree, CC BY 2.0.**

This is the article that defines mas kahwin as the payment made *pada masa akad
nikah*, and it carries a whole section headed "Bila mas kahwin diserahkan?"
answered "Ia biasanya diserahkan pada majlis akad". The photograph is that
moment: a Malay couple immediately after their akad. The picture is of the thing
the article is about, which is the only test that separates a photograph from
decoration.

The register records this file as fit for an in-article image and NOT for a
cover — 1500×1000 is the ceiling Flickr publishes, and a cover would render it
soft through `crop-4.3x1-desktop-hero`. This is the use it was cleared for.

Licence re-checked against `docs/asset-register/asset-register.csv` before use:
`HK-P-0001`, `boleh-guna`, `license_class: S`, CC BY 2.0 template read on the
Commons file page, origin traced to the Flickr upload, personality-rights notice
recorded, and the use is editorial with a visible credit.

## The seven I skipped, and why

Six of them — `mas-kahwin-ikut-negeri`, `mas-kahwin-johor`,
`mas-kahwin-kelantan-terengganu`, `mas-kahwin-perak`,
`mas-kahwin-pahang-negeri-sembilan`, `mas-kahwin-sabah-sarawak` — answer one
question: what is the number in this state. Nothing in the pool of thirteen
photographs depicts a rate, a handover, or a state. The two that come closest
match only on a place name: a Perak community hall (HK-P-0002) and a Terengganu
museum textile (HK-P-0006). Putting either on a mas kahwin page because the
state matches is decoration, and the Managing Editor already refused it on that
exact ground.

The seventh, `mas-kahwin-melebihi-kadar-minimum`, is about the amount agreed
above the floor between a couple and two families. The pool's remaining images
are pelamin, bersanding and hantaran. A **hantaran** photograph on a **mas
kahwin** page is worse than no photograph: telling those two apart is the job
this whole cluster exists to do, and an unlabelled tray of dulang at the top of
the page undoes it faster than the prose repairs it.

**What unlocks the other seven:** the pool contains exactly one photograph whose
subject is the akad. Two or three more — the handover itself, the borang being
signed, a registrar's table — would let the state articles carry an image that
earns its place. That is a sourcing brief, not an ingest one.

## The file-size problem: checked, and it was real

The brief said confirm, do not assume. Confirmed, and the assumption would have
been wrong.

`next.config.ts` sets `images.unoptimized: true` — every derivative is made by
Sharp at upload time and Next serves the `src` byte-for-byte. Ingest was storing
the **original upload** as the figure's `src`. The renderer's
`getArticleVariantUrl` cannot rescue that: its pattern only matches a URL
already ending `high.webp` / `low.webp` / `original.<ext>`, and an original
keyed `…/1787-foto.jpg` matches none of them, so it is returned untouched and
served whole. There is no srcset either, so the page makes exactly one request
for exactly that URL.

On this image that would have been **799,808 bytes**. On
`S-baju-pengantin-lelaki-melaka-marcin-konsek.jpg` it would have been
**15,016,483 bytes** — the 15 MB original, straight to a phone.

Fixed before the write. Ingest now stores the `high` variant, which is also the
shape all 29 existing articles already use (`…/<timestamp>-<name>/high.webp`),
so the renderer's low/high swap works on an ingested figure as it does
everywhere else.

Measured on the live page, mobile user agent:

```
high.webp (what the page requests)       status=200  bytes=68,564   image/webp
original.jpg (reachable, never fetched)  status=200  bytes=799,808  image/jpeg
cover crop-4x5-mobile-cover.webp         status=200  bytes=39,292   image/webp
srcset entries on the page: 0
```

**67 KB.** The original is still in the bucket, addressed by a key nothing on
the page points at.

## The credit template needed no fix

The brief said a code fix was in scope if the template did not render `credit`
for in-article images. It does. `figureBlock` renders through the React path in
`article-renderer.tsx` and emits the credit as a `<figcaption>` linked to
`creditUrl` with `rel="noopener noreferrer"` and no `nofollow`, which is what
the approved strategy asks for. Verified on the live HTML above rather than
assumed.

## Placement

Ingest appended every credited figure after the body. On these articles the body
ends with the last FAQ answer, so "after the body" is the worst place on the
page, and the brief asked for near the top.

Ingest still does not guess. The article file now declares the position:
`placeAfter: 2` puts the figure below the second top-level block. Omit the field
and the figure is appended exactly as before, so no existing file changes
behaviour. An out-of-range value is refused before anything is uploaded, not
silently clamped — a figure quietly landing at the end of a piece the editor
wanted illustrated at the top is the failure the field exists to remove.

## Proof

| URL | first request | figures |
|---|---|---|
| `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` | 200, 0 redirects | 0 |
| `/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin` | 200, 0 redirects | **1** |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-johor` | 200, 0 redirects | 0 |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-kelantan-terengganu` | 200, 0 redirects | 0 |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-perak` | 200, 0 redirects | 0 |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-pahang-negeri-sembilan` | 200, 0 redirects | 0 |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-sabah-sarawak` | 200, 0 redirects | 0 |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-melebihi-kadar-minimum` | 200, 0 redirects | 0 |

All eight slugs unchanged. No article was created, none was deleted; the run was
an upsert on one existing row, so the URL could not move.

The article text is untouched. The rendered body text before and after the write
is character-identical once the figure is removed from the comparison. The only
other differences on the page are the "Dikemas kini" date moving to 25 Ogos and
the photo counter reading 2 instead of 1 — both consequences of the image.

`published_at` did not move: `publishedAt: "2026-08-24T15:46:11.393Z"` was added
to the article file first, so the upsert wrote the same instant back. Without it
the upsert stamps `published_at` with the date of the edit, which would have
moved the sitemap `lastmod` and the JSON-LD `datePublished` of an indexed page.

**Six of the other seven ingest files still carry no `publishedAt`.** Only
`A1-mas-kahwin-ikut-negeri.md` has one. Re-ingest any of the six as they stand
and its publication date silently becomes the date of the edit. The correct
values for all eight are in the before-state capture below.

Undo recorded before the write, in
`aug-25-2026-undo-images-onto-live-articles/` — `UNDO.md` plus a
`before-state.json` holding every column of all eight rows and their category,
tag, media and usage rows.

## Two things I found and did NOT fix

Both are outside this brief. Neither was urgent enough to justify widening the
blast radius on a production write, and both should be somebody's next task.

**1. Internal review notes are published on a live page.**
`apa-itu-mas-kahwin` carries a section headed
`## SOURCE NOTES (for the verification lead, not published)` — in English, on
the live page, including a table of struck-through claims removed during review.
It has been public since 24 Ogos. It is in the approved ingest file, so it went
out with the article. I left it because the brief says do not touch the article
text, and cutting a section is an editorial act. **It should come out today**;
it is a deletion in the file and a re-ingest.

**2. `articles.content` is double-encoded on every ingested article.**
`jsonb_typeof(content)` returns `string` on all eight; it returns `object` on
all 29 legacy articles. The cause is in `scripts/ingest-article.mts`:
postgres.js serialises the parameter such that `${JSON.stringify(doc)}::jsonb`
lands as a jsonb *string*, not an object. The site renders both, because
Drizzle's `jsonb` column parses a string on the way out, so nothing is visibly
broken — but SQL that reaches into `content->…` sees nothing on these eight
rows, which is a trap for any future query, migration or content audit. Left
alone deliberately: fixing it rewrites the storage shape of eight live rows, and
that is a bigger write than this brief authorised. It is also recorded in
`UNDO.md` §5, because a restore must write the captured shape back verbatim.

A third, smaller one: the photo lightbox lists the figure without its credit.
The credit is on the page, which is what the licence needs, but the gallery is a
weaker surface. Pre-existing behaviour shared with all 29 legacy articles.

## What I did not do

- Nothing was deployed. The fixes are in the ingest script, which runs locally;
  the live page is correct because the database now holds the right URL.
- The P1/P6 drafts were not touched.
- No other article was written to. The seven other C2.4 rows still carry their
  24 Ogos `updated_at`.
- The 15 MB originals were not re-encoded or altered. The one image used was
  uploaded as downloaded, and the derivative pipeline produced the 67 KB the
  page serves.
- Nothing was committed. The code changes and this log are written but unstaged,
  in `hellokahwin-site` worktree `pillars-ingest-redirects` and in this repo.

---

# Run 2 — 25 Ogos 2026, authorised by the CEO after run 1

Three things were authorised: fix the jsonb double-encoding, finish the other
seven images, and name the editorial cut rather than make it. All three below.

## 1. The double-encoding is fixed, in the script and on all eight rows

**The script first, so nothing new is written wrong.** `scripts/ingest-article.mts`
passed nine values into `::jsonb` parameters as pre-stringified strings.
postgres.js reads the `::jsonb` cast that follows a placeholder, types the
PARAMETER from it, and serialises with that type's serializer — which for json
is `JSON.stringify`. Give it a string that is already JSON and it stringifies a
second time. Probed against a real database, three ways:

```
${JSON.stringify(doc)}::jsonb        ->  jsonb_typeof = string   (the defect)
${JSON.stringify(doc)}::text::jsonb  ->  jsonb_typeof = object   (the CAST decides, not the value)
${sql.json(doc)}::jsonb              ->  jsonb_typeof = object   (correct)
```

All nine now go through `sql.json()`. The null branches were checked separately
and still produce SQL NULL, not a jsonb `null` scalar.

**Then the eight rows.** Before and after, from the database:

```
slug                                content   ->  content
apa-itu-mas-kahwin                  string    ->  object
mas-kahwin-ikut-negeri              string    ->  object
mas-kahwin-johor                    string    ->  object
mas-kahwin-kelantan-terengganu      string    ->  object
mas-kahwin-melebihi-kadar-minimum   string    ->  object
mas-kahwin-pahang-negeri-sembilan   string    ->  object
mas-kahwin-perak                    string    ->  object
mas-kahwin-sabah-sarawak            string    ->  object
```

`cover_image_variants`, `cover_image_smart_crops`, `cover_image_focal_point`,
`cover_image_detection_data` and the matching `media` columns moved with them.

```sql
select count(*) from articles where jsonb_typeof(content) = 'string';  -- 0
```

Zero rows left in the whole table. `content->'content'` is now queryable on
every article, which it was not on any of these eight.

**The value did not change, only the shape.** Every row was deep-compared
against the pre-run capture after decoding. Seven came back "differs" on a first
pass and the reason is worth recording: jsonb canonicalises object key order, so
`{"type":"text","text":…}` is stored as `{"text":…,"type":"text"}`. That is
Postgres normalising, not content moving, and it is exactly what the 29 legacy
articles look like. Under a key-order-insensitive comparison all eight bodies
are identical, with figures added only where intended.

**A guard so it cannot come back.** `src/lib/inspire/__tests__/ingest-jsonb-encoding.test.ts`
scans the script for a `JSON.stringify` in any `::jsonb` parameter position and
asserts all nine go through `sql.json`. It was verified by reintroducing the
defect and watching it fail. It strips comments before scanning, because the
comment explaining the defect has to quote the wrong form beside the right one.

This mattered more than eight rows: twenty more articles are queued through this
script.

## 2. The other seven images: two more placed, five skipped

**`mas-kahwin-ikut-negeri` — HK-P-0011, mohd hasan / Pexels, `placeAfter: 2`.**
A real Malaysian bersanding: the couple on the pelamin under a floral arch, an
attendant fanning on each side.

I am placing this one for ORIENTATION, not illustration, and that is a weaker
standard than `apa-itu-mas-kahwin` met — it should be read as a different kind
of decision, not the same one. Nothing in the pool depicts a state rate, so no
photograph can illustrate this article's subject. What it can do is tell a
reader arriving at the cluster's front door — the highest-traffic page in the
set, and the only one about Malaysian weddings rather than one state's number —
what kind of wedding this section is about. It sits under the two intro
paragraphs and above the 14-jurisdiction table. If the table matters more than
the image, `placeAfter: 8` moves it below the table and nothing else changes.

**`mas-kahwin-melebihi-kadar-minimum` — HK-P-0009, mohd hasan / Pexels,
`placeAfter: 5`.** A dulang hantaran of fruit and artificial flowers.

Run 1 skipped this article, and said a hantaran photograph on a mas kahwin page
was worse than none. That was right for the state articles and wrong for this
one, and reading the article properly is what changed it. This is the article
where the boundary is adjudicated: it defines hantaran in its fifth paragraph,
its FAQ carries the Selangor fatwa under which wang hantaran IS counted as mas
kahwin, and it answers whether mas kahwin can be given as goods rather than
cash. The picture is of the thing the article argues about.

`placeAfter: 5` is deliberately NOT the top. It puts the photograph immediately
under the paragraph that defines hantaran, so a reader meets it only after the
sentence saying what it is. At the top, above any explanation, the same
photograph would teach the confusion the article exists to remove.

**Five skipped: `mas-kahwin-johor`, `mas-kahwin-kelantan-terengganu`,
`mas-kahwin-perak`, `mas-kahwin-pahang-negeri-sembilan`,
`mas-kahwin-sabah-sarawak`.**

Every section heading in all five was read before deciding. They answer one
question — what is the number in this state — through gazettes, fees and
verification steps. Nothing in the pool of thirteen depicts a rate, a handover,
a form or a state. The two that come closest match a place name only: a Perak
community hall (HK-P-0002, a venue) and a Terengganu museum textile (HK-P-0006,
a fabric). Using either because the state matches is decoration, and the
Managing Editor already refused it on that exact ground.

The strongest near-miss was `mas-kahwin-pahang-negeri-sembilan`, which carries
three real sections on adat perpatih. That is a genuine visual subject; there is
no adat perpatih photograph in the pool.

Five near-identical lookup pages carrying five unrelated wedding photographs
would be wallpaper, and would make the cluster look padded rather than finished.

**What unlocks them:** photographs whose subject is the transaction — the
handover at the akad, a borang nikah being completed, a registrar's table, mas
kahwin counted out. One akad photograph exists and it is on `apa-itu-mas-kahwin`.
Three or four more of that kind would let every state article carry an image
that earns its place. That is a sourcing brief.

## 3. The editorial cut — named, not made

**Article:** `apa-itu-mas-kahwin`
**URL:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin
**Section:** `## SOURCE NOTES (for the verification lead, not published)`
**Where:** the last H2, after "Bagaimana jika keluarga anda buat cara berbeza?",
following a horizontal rule. It runs to the end of the article.
**Contains:** an evidence table of every claim with its gazette URL and grade;
"Variances recorded so no later article flattens them"; and "Claims removed
during the review, recorded so they are not reintroduced" — a table of
struck-through claims with the reasons they were wrong.
**In the file:** `drafts/ingest/A2-apa-itu-mas-kahwin.md`, from the `---` rule
before the heading to end of file.
**Live since:** 24 Ogos 2026. It is in English, on a Malay page.

Not cut. It is a clean deletion from that rule to EOF, then one re-ingest.

## Proof, run 2

| URL | first request | figures | credit rendered |
|---|---|---|---|
| `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` | 200, 0 redirects | **1** | `Kredit: mohd hasan / Pexels` |
| `/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin` | 200, 0 redirects | **1** | `Kredit: Azlan DuPree (CC BY 2.0)` |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-johor` | 200, 0 redirects | 0 | — |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-kelantan-terengganu` | 200, 0 redirects | 0 | — |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-perak` | 200, 0 redirects | 0 | — |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-pahang-negeri-sembilan` | 200, 0 redirects | 0 | — |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-sabah-sarawak` | 200, 0 redirects | 0 | — |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-melebihi-kadar-minimum` | 200, 0 redirects | **1** | `Kredit: mohd hasan / Pexels` |

All eight slugs unchanged, no redirects, none created or deleted. Every page
renders its body; none shows a render fallback.

Figure position on the live pages, reading the rendered body:

```
mas-kahwin-ikut-negeri             p p FIGURE h3 p table p p p
mas-kahwin-melebihi-kadar-minimum  p p p p p FIGURE h2 p p
```

Both exactly where the file declared them.

`published_at` held on all eight, checked value by value against the pre-run
capture. `publishedAt` is now carried in all eight article files.

Delivered bytes, mobile user agent, first request:

```
mas-kahwin-ikut-negeri       high.webp  2400x1600  457,682 bytes  image/webp
melebihi-kadar-minimum       high.webp  2400x3600  341,440 bytes  image/webp
apa-itu-mas-kahwin           high.webp  1500x1000   68,564 bytes  image/webp
```

Both new derivatives were downloaded from production and looked at: correct
orientation, correct framing, quality good.

**The 68 KB in run 1 was not representative and should not be used as a
baseline.** That source is only 1500×1000, which is the licence ceiling on that
one file. A normal full-resolution photograph downscales to the `high` preset's
2400px and lands at 340–460 KB. The `high` preset is sized for a full-bleed
cover, but an in-article figure is capped at 680 CSS px by the renderer, and
with `images.unoptimized: true` there is no srcset — so every reader gets 2400px
for a 680px slot. A figure-sized preset around 1360px would cut this to roughly
a third. Not changed here; it is a preset decision, and presets are
admin-configurable in `admin_settings`.

## Two pipeline findings for the next twelve images

Neither was authorised in this round and neither is applied. Both touch code
shared with the admin uploader and the 682-item library, so they want their own
change rather than a silent widening of this one.

**1. The named crops are encoded at `quality: 100`, and it is real.**
`src/lib/storage/smart-crop.ts:499` uses `.webp({ quality: 100 })`. The
`high`/`low` variants use the admin-configurable presets, `quality: 80` and
`30`. Measured on the akad photograph:

```
high.webp                     68,564   (q80,  2400px ceiling)
low.webp                      19,404   (q30,  1200px ceiling)
crop-4x5-mobile-cover.webp   282,954   (q100)
crop-4.3x1-desktop-hero.webp 148,686   (q100)
crop-4x3-article-card.webp   365,746   (q100)
crop-16x9-og.webp            180,934   (q100)
```

WebP at 100 is near-lossless and costs roughly 4–5× q80 on photographic
content. The eight cover graphics do not show it — a flat title card compresses
the same at any quality, which is why their crops sit at 21–39 KB. Every
PHOTOGRAPHIC cover from here on pays the full multiple. One line, and only new
crops are affected.

There is a second, quieter waste beside it: ingest runs `processSmartCrops` on
every image, but only COVERS consume crops — every consumer reads
`coverImageSmartCrops`, and nothing reads `media.smart_crops`. The four crops
generated for each in-article photograph are written to R2 and never requested
by any page. That is ~978 KB of dead objects for the akad photograph alone.

**2. EXIF orientation is not applied, and one image in the pool needs it.**
Neither `image-variants.ts` nor `smart-crop.ts` calls `.rotate()`, and Sharp
does not auto-orient by default. Twelve of the thirteen sourced files carry
orientation 1 or none. `S-majlis-doa-selamat-ahmad-ali-karim.jpg` carries
**orientation 8**, and is stored 6240×4160 while the register records it as
4160×6240. Ingested as the pipeline stands, it publishes sideways. It is
intended for P7 / P1, both in the queue.

## Also recorded

Each `--update` re-ingest writes a NEW timestamped R2 key and therefore a NEW
`media` row; the previous one is left behind pointing at objects that are still
in the bucket. `apa-itu-mas-kahwin` has been ingested three times and now has
six media rows, four of them orphaned. Nothing is broken and nothing was
deleted, but the admin media library will show duplicates, and the same will
happen once per re-ingest across the twenty queued articles.

## Register

`digunakan_dalam` updated for the assets now in use: HK-P-0001
(`rukun-nikah; apa-itu-mas-kahwin`), HK-P-0009
(`mas-kahwin-melebihi-kadar-minimum`), HK-P-0011 (`mas-kahwin-ikut-negeri`).
722 lines, unchanged elsewhere.

## Gate

`pnpm typecheck` clean · `pnpm test` **229 passed** across 20 files (5 new this
session: 3 for `placeAfter`, 2 for the jsonb guard) · `pnpm lint` 0 errors ·
Prettier clean on every file touched.

Nothing was deployed; the fixes are in a script that runs locally. Nothing was
committed.

---

# Run 3 — 25 Ogos 2026: the leak cut, the five answered, the fixes committed

## 1. The SOURCE NOTES leak — removed, and the other seven checked

**Cut.** `A2-apa-itu-mas-kahwin.md`, from the horizontal rule at line 152 to
EOF: 205 lines to 151. The article now ends on its own last reader-facing
paragraph, the one pointing to `mas kahwin melebihi kadar minimum`. Re-ingested
in place, same slug, same URL.

The file as it stood before the cut is preserved beside this record as
`A2-apa-itu-mas-kahwin-BEFORE-source-notes-cut.md`. Nothing in that section was
destroyed — it is verification evidence and it should live in the docs repo, not
in the article body.

Live page, first request after the write:

```
status=200  Age: 0  X-Vercel-Cache: REVALIDATED
leak markers on the page: NONE
figures: 1     credit: Kredit: Azlan DuPree (CC BY 2.0)
page HTML: 128,698 bytes -> 78,477 bytes
content blocks: 64 -> 54     published_at: 2026-08-24T15:46:11.393Z (held)
```

**The other seven: checked three ways, all clean.**

- Every H2/H3 heading in all eight files listed and read. Only A2 carried a
  non-Malay, non-reader heading.
- Every file BODY grepped for the wider family of tells, not just the phrase
  that happened to be used here: `TODO`, `FIXME`, `INTERNAL`, `DRAFT`,
  `not published`, `verification lead`, `review board`, `accuracy seat`,
  `do not publish`, `for the board`, `Grade`, `Claim in the article`,
  `CORRECTED`, `Recorded so`, struck-through `~~`, HTML comments, `[[wikilinks]]`.
  Seven clean, A2 the only hit.
- The eight LIVE pages fetched and scanned for the same markers, because a file
  and a published row can drift. Seven clean, A2 the only hit — now zero.

And across the whole table, not just these eight:

```sql
select count(*) from articles
 where content::text ilike '%SOURCE NOTES%' or content::text ilike '%verification lead%';
-- 0
```

That query is only possible because the jsonb shape was fixed first.

## 2. The five remaining articles — per-article, and the reason is the same shape

A photograph does not help any of the five, and the register already says what
does. All ten C2.4 graphics were specified and board-approved on 24 Aug, each
with its template and its approved Malay alt text, and every one is still
`status_guna: belum-dihasilkan` — **specified, approved, never built**.

| Article | Photograph? | Why not | What the register already specifies |
|---|---|---|---|
| `mas-kahwin-johor` | no | The article turns on where RM22.50 came from: *sekati perak* under Ahkam Syar'iyyah Johor 1935, art. 309, and whether it still stands in 2026. That is a date sequence. No photograph in the pool depicts silver, a gazette, or a rate | **HK-G-0004** — "Garis masa kadar RM22.50 di Johor, 1935 hingga 2026", templat `urutan-langkah` |
| `mas-kahwin-kelantan-terengganu` | no | Two states, neither setting a rate, plus a circulating claim traced to one unreferenced line in a journal paper. The payload is a two-column comparison. The only Terengganu image in the pool is a 19th-century museum textile — it matches the state name and nothing else | **HK-G-0005** — "Kelantan dan Terengganu berbanding", templat `jadual-perbandingan` |
| `mas-kahwin-perak` | no | Perak sets no minimum; the article's substance is the Pk. P.U. 30 forms and a fee schedule. The only Perak image in the pool is a kampung hall exterior — a venue, and one the register has already earmarked for `harga-sewa-dewan-kahwin`, where it IS the argument rather than decoration | **HK-G-0006** — "Jadual fi rasmi urusan perkahwinan di Perak", templat `jadual-perbandingan` |
| `mas-kahwin-pahang-negeri-sembilan` | no | The strongest near-miss in the set: three real sections on adat perpatih, which is genuinely visual. There is no adat perpatih photograph in the pool, and a generic Peninsular couple placed on the article that explains adat perpatih would actively mislead — the same class of error as captioning Indonesian seserahan as Malaysian hantaran | **HK-G-0007** — "Garis masa kadar mas kahwin Pahang"; **HK-G-0008** — "Jadual bayaran rasmi JHEAINS" |
| `mas-kahwin-sabah-sarawak` | no | Every photograph in the pool is Peninsular — Terengganu, Putrajaya, Melaka, Selangor, Perak. There is no East Malaysian image at all. Putting a Peninsular wedding on the Sabah and Sarawak page is a regional mismatch of exactly the kind the sourcing run was written to prevent | **HK-G-0009** — "Dua undang-undang, satu kesan yang sama", templat `jadual-perbandingan` |

The pattern is not a coincidence. These five are reference pages: dates, fees,
statutes, comparisons. What a reader needs is the data drawn, and the board
already decided that and wrote the alt text for it.

**The blocker is three templates, not the photo pool.**
`scripts/generate-cover-graphics.mts` supports exactly one template today,
`kad-tajuk`, which is what produced the eight covers. The three the graphics
need — `jadual-perbandingan`, `urutan-langkah`, `grid-kategori` — are specified
in `aug-25-2026-spec-graphic-kit-remaining-templates.md` and not implemented.
Build those three and all five articles can be finished from the register with
no new sourcing, no new licence checks and no new editorial judgement.

## 3. Committed

`12182d6 fix(ingest): stop writing jsonb as strings, and serve figures the right bytes`

on `ianng89/pillars-ingest-redirects`. Six files, +448/-18: the script, the
schema, three test files and the two engineering notes. Not pushed.

Deliberately NOT staged, because they were in the tree before this work started
and belong to someone else's session: `.claude/settings.local.json`,
`package.json`, `.tmp-ceo-*.mjs`, `.tmp-covers/`, `scripts/covers/`,
`scripts/generate-cover-graphics.mts`.

The docs repo is not committed either. Its working tree carries ~90 untracked
files from other sessions — briefs, drafts, done-records, the whole asset
register — and a commit there would sweep up work that is not mine to land. The
article files, the register updates and these records are written and waiting.

## Final state, all eight

```
mas-kahwin-ikut-negeri             200  0 redirects  1 figure   no leak
apa-itu-mas-kahwin                 200  0 redirects  1 figure   no leak
mas-kahwin-johor                   200  0 redirects  0 figures  no leak
mas-kahwin-kelantan-terengganu     200  0 redirects  0 figures  no leak
mas-kahwin-perak                   200  0 redirects  0 figures  no leak
mas-kahwin-pahang-negeri-sembilan  200  0 redirects  0 figures  no leak
mas-kahwin-sabah-sarawak           200  0 redirects  0 figures  no leak
mas-kahwin-melebihi-kadar-minimum  200  0 redirects  1 figure   no leak
```

`pnpm typecheck` clean · `pnpm test` 229 passed across 20 files · `pnpm lint`
0 errors.

---

# Run 4 — 25 Ogos 2026: re-dispatch, independently verified, and one block

The brief was dispatched a second time. **Nothing was written to production in
this run.** The brief was already satisfied by runs 1–3; the work of run 4 was
to prove that against production from scratch rather than trust the record
above, and to check whether anything had drifted since run 3 closed.

Every number below was measured in run 4, not copied from the sections above.

## The deliverable still stands

**https://hellokahwin.com/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin**

## All eight URLs, first request, mobile user agent

```
slug                               status redirects  figcaptions  page bytes
mas-kahwin-ikut-negeri                200         0            1     121,994
apa-itu-mas-kahwin                    200         0            1      98,707
mas-kahwin-johor                      200         0            0      96,265
mas-kahwin-kelantan-terengganu        200         0            0     103,800
mas-kahwin-perak                      200         0            0      94,229
mas-kahwin-pahang-negeri-sembilan     200         0            0     101,075
mas-kahwin-sabah-sarawak              200         0            0     102,255
mas-kahwin-melebihi-kadar-minimum     200         0            1      95,702
```

`url_effective` equals the requested URL on all eight. **No URL moved.** The
database holds exactly these eight slugs; none was created, none deleted.

## The credit lines, quoted from the live HTML

```
mas-kahwin-ikut-negeri
  text : Kredit: mohd hasan / Pexels
  href : https://www.pexels.com/photo/portrait-of-newlywed-couple-15430952/
  rel  : noopener noreferrer

apa-itu-mas-kahwin
  text : Kredit: Azlan DuPree (CC BY 2.0)
  href : https://commons.wikimedia.org/wiki/File:Malay_couple.jpg
  rel  : noopener noreferrer

mas-kahwin-melebihi-kadar-minimum
  text : Kredit: mohd hasan / Pexels
  href : https://www.pexels.com/photo/vibrant-fruit-basket-with-floral-accents-37097198/
  rel  : noopener noreferrer
```

Followed links, no `nofollow`. Each `credit` and `credit_url` was compared
character-for-character against the register row for that asset; all three match.

## Delivered bytes — no original reaches a reader

In-article figure, the URL the page actually requests:

```
mas-kahwin-ikut-negeri             high.webp   457,682 bytes  image/webp
mas-kahwin-melebihi-kadar-minimum  high.webp   341,440 bytes  image/webp
apa-itu-mas-kahwin                 high.webp    68,564 bytes  image/webp
```

Mobile cover crop, `crop-4x5-mobile-cover.webp`, all eight:

```
mas-kahwin-ikut-negeri              55,778     mas-kahwin-pahang-negeri-sembilan  56,998
apa-itu-mas-kahwin                  39,292     mas-kahwin-sabah-sarawak           63,502
mas-kahwin-johor                    50,908     mas-kahwin-melebihi-kadar-minimum  52,424
mas-kahwin-kelantan-terengganu      57,258     mas-kahwin-perak                   50,808
```

`srcset` attributes on the three photo pages: **0**. References to an original
`.jpg` on those pages: **0**. The 12–15 MB originals are in the bucket and
nothing on any page points at one.

## Database, read-only

```
all eight            status=published, published_at unchanged from the 24 Ogos capture
jsonb_typeof(content)  object on all eight
whole table            0 articles with jsonb string content
figureBlocks           ikut-negeri 1 · apa-itu 1 · melebihi 1 · other five 0
S-class media          credit, credit_url, license_class=S, licensor_name present on all three
leak scan              0 articles matching SOURCE NOTES / verification lead / not published / TODO
```

## The block — seven unregistered photographs are queued onto these eight pages

This is the one thing that changed since run 3, and it is why run 4 wrote
nothing.

At **17:29:54 today** all eight files in `drafts/ingest/` were rewritten in a
single batch — after this record's run 3 was finalised at 17:29:43. Every one
now names a **sourced photograph as its `cover`**, with the kad tajuk moved
in-article, carrying the comment *"dipindahkan ke dalam artikel mengikut arahan
pemilik 25 Ogos 2026"*. That is the work of
`aug-25-2026-brief-human-covers-everywhere.md`, a separate approved brief. None
of it is live: all eight covers in production are still the kad tajuk.

**Seven of those eight cover photographs are not in the asset register.**

```
HK-P-0003  boleh-guna   S-pengantin-melayu-pelamin-fyruz-alqadiri.jpg   (melebihi-kadar-minimum)
NOT IN REGISTER         S-pengantin-merah-jambu-pelamin-mohd-hasan.jpg  (ikut-negeri)
NOT IN REGISTER         S-pengantin-putih-jambangan-azman-aziz.jpg      (apa-itu-mas-kahwin)
NOT IN REGISTER         S-kompang-gendang-johor-stress043.jpg           (johor)
NOT IN REGISTER         S-arak-pengantin-kelantan-malexi.jpg            (kelantan-terengganu)
NOT IN REGISTER         S-muzik-tradisional-kenduri-malexi.jpg          (perak)
NOT IN REGISTER         S-pasangan-pelamin-bunga-duduk-mohd-hasan.jpg   (pahang-negeri-sembilan)
NOT IN REGISTER         S-pasangan-baju-oren-azman-aziz.jpg             (sabah-sarawak)
```

The register holds 721 rows and exactly **13** `S-` photographs — the original
thirteen. The images folder now holds **33** files: twenty were downloaded
between 17:21 and 17:26 today and none has been registered. The register's last
write was 17:16:39, thirteen minutes before the article files were rewritten.

Grepped for each of the seven by name across the whole CSV: zero hits. They are
absent, not merely renamed.

**This brief's own hard rule decides it:** *"Confirm each licence against the
register before use. Do not take my list as proof. If an image's licence is not
recorded, do not use it."* Running `--update` on these files as they stand would
put seven photographs whose licences are not recorded anywhere onto eight
indexed production pages. Refused on that ground.

It is not a defect in the covers work — that brief is still in flight and has no
done-record yet. It is unfinished, and finishing it is that brief's job:
register the twenty new files, then ingest. **Whoever ships those covers must
register the licences first.** The eight covers and the three in-article figures
can then go out in one write.

## What run 4 changed

Nothing in production, nothing in either repo except this section. Two
throwaway read-only query scripts were written into the site worktree and
deleted. `.tmp-ceo-*.mjs`, `.tmp-covers/`, `.tmp-ops/`, `scripts/covers/` and
`package.json` belong to other sessions and were not touched.

## Still open, unchanged from run 3

- Five state articles carry no photograph. The unlock is the three graphic
  templates (`jadual-perbandingan`, `urutan-langkah`, `grid-kategori`), not more
  sourcing — HK-G-0004 to HK-G-0009 are already specified and alt-texted.
- Named crops encode at `quality: 100`; the `high` preset is 2400px for a 680px
  slot.
- EXIF orientation is not applied; `S-majlis-doa-selamat-ahmad-ali-karim.jpg`
  will publish sideways.
- Re-ingest orphans a `media` row per image per run: `apa-itu-mas-kahwin` now
  has 8 rows against it, `mas-kahwin-ikut-negeri` 7.
- 623 rows in the 682-item legacy WordPress library still have no credit or
  licence class. Pre-existing, outside this cluster.
