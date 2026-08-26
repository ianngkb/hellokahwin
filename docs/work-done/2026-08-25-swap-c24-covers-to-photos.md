# The eight live C2.4 covers are photographs now, and the text cards are gone

25 Aug 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-swap-c24-covers-to-photos.md` (docs repo)
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo record:** `docs/work-done/2026-08-25-swap-c24-covers-UNDO.md` + `…-UNDO.sql` — written before the first write.
**Company entry (carries the `## Retrospective`):** `docs/work-done/aug-23-2026-session-01/aug-25-2026-done-swap-c24-covers-to-photos.md` in the docs repo.

Eight indexed articles under `/artikel/hantaran-mas-kahwin/` carried `kad-tajuk`
typographic cards as their cover and `og:image`. All eight now carry a licensed
photograph of a Malaysian Malay wedding, with the full credit chain rendering on
the page. **No URL changed. No article text changed.**

## Two premises in the brief were wrong, and correcting them changed the method

### The front-mattered files existed all along

The brief says the C2.4 drafts are "the old editorial deliverable format — no
YAML front matter at all… you cannot simply edit a draft and re-ingest", and
points at `drafts/A1..A8-*-REVIEWED.md`. True of those files. **Not true of
`drafts/ingest/A1..A8-*.md`**, which are fully front-mattered, already carry the
approved photograph covers, and were produced by the `human-covers-everywhere`
run. That run's own log says why they had never shipped:

> The eight live C2.4 articles need the `--update` ingest run to put these
> covers on the live pages. **Blocked behind the `articles.content`** [double
> encoding defect].

Commit `12182d6` closed that defect. The block was stale; the work was done and
waiting. So the photograph choices were **not** re-made in this run — they were
licence-verified editorial decisions already on the record, and re-deciding them
would have thrown away a Managing Editor's visual pass.

### A markdown round-trip would have destroyed three articles

The brief's instruction to "read what is published, swap the cover, write back"
reads as: reconstruct a file from the live TipTap JSON. **That is unsafe here,
and it is provable rather than a matter of taste.** A census of the eight live
documents:

```
paragraph 300 · heading 90 · table 11 · orderedList 9 · blockquote 8 · figureBlock 3
```

`figureBlock` is a **custom node markdown cannot produce** — `ingest-article.mts`
says so in its own comment on `markdownExtensions()`: *"The custom blocks
(figureBlock and friends) are absent on purpose — markdown never produces
them."* A JSON → markdown → JSON round trip through that vocabulary silently
**drops all three existing in-article photographs**, and puts 11 state-data
tables through a lossy conversion on pages whose entire value is those tables.

Since the source files existed, no round trip was needed. But the check that
made it safe is the one worth keeping.

## The safety check that gated the whole run

Before any write, every file was converted through the **same** pipeline ingest
uses and compared against the live `content`, ignoring `figureBlock` nodes:

```
PROSE-IDENTICAL blocks 55->55  title:ok meta:ok publishedAt:ok  mas-kahwin-ikut-negeri
PROSE-IDENTICAL blocks 53->53  title:ok meta:ok publishedAt:ok  apa-itu-mas-kahwin
PROSE-IDENTICAL blocks 47->47  title:ok meta:ok publishedAt:ok  mas-kahwin-johor
PROSE-IDENTICAL blocks 58->58  title:ok meta:ok publishedAt:ok  mas-kahwin-kelantan-terengganu
PROSE-IDENTICAL blocks 46->46  title:ok meta:ok publishedAt:ok  mas-kahwin-perak
PROSE-IDENTICAL blocks 62->62  title:ok meta:ok publishedAt:ok  mas-kahwin-pahang-negeri-sembilan
PROSE-IDENTICAL blocks 50->50  title:ok meta:ok publishedAt:ok  mas-kahwin-sabah-sarawak
PROSE-IDENTICAL blocks 47->47  title:ok meta:ok publishedAt:ok  mas-kahwin-melebihi-kadar-minimum

ALL EIGHT: re-ingest reproduces the live prose exactly.
```

**This check reported a false failure first, and the false failure is the useful
part.** All eight came back `PROSE-DIFFERS` on the first attempt, every article,
first block. The diff:

```
LIVE : {"text":"Kadar minimum mas kahwin ikut negeri…","type":"text"}
FILE : {"type":"text","text":"Kadar minimum mas kahwin ikut negeri…"}
```

Same text, different key order. **`jsonb` does not preserve object key order** —
Postgres normalises it — so a raw `JSON.stringify` comparison against a jsonb
column reports every text node in every article as changed. Taken at face value
that reads "re-ingesting rewrites all eight articles", and the reasonable
response is to abandon `--update` and hand-edit production. Canonicalising the
key order before comparing turned eight false alarms into eight clean passes.

The other fields were checked the same way, because `on conflict do update` sets
them all from the file:

```
title, meta_description, published_at   identical in file and row, all eight
excerpt        null in row, absent from file  -> stays null
tags           none in row, none in file      -> stays none
authorship     'ai' in row, default in file   -> stays 'ai'
categories     C2.4 + P2 in row and file      -> reconciles to the same pair
review_status  'pending_review', reviewed_at null -> reset writes the same values
```

The `review_status` reset discards no human sign-off, because none of the eight
carried one.

## The covers, and the two alt strings that did not match their pixels

Every cover was **viewed before it shipped**, not taken from the register's
description. Eight are Malaysian Malay wedding context; none is a Western stock
wedding; **no article had to keep a text card.**

| Slug | Photograph | Photographer | Licence |
|---|---|---|---|
| `mas-kahwin-ikut-negeri` | `S-pengantin-merah-jambu-pelamin-mohd-hasan.jpg` | mohd hasan | Pexels |
| `apa-itu-mas-kahwin` | `S-pengantin-putih-jambangan-azman-aziz.jpg` | Azman Aziz | Pexels |
| `mas-kahwin-johor` | `S-kompang-gendang-johor-stress043.jpg` | Stress 043 | CC BY-SA 4.0 |
| `mas-kahwin-kelantan-terengganu` | `S-arak-pengantin-kelantan-malexi.jpg` | Malexi | CC BY-SA 3.0 |
| `mas-kahwin-perak` | `S-muzik-tradisional-kenduri-malexi.jpg` | Malexi | CC BY-SA 3.0 |
| `mas-kahwin-pahang-negeri-sembilan` | `S-pasangan-pelamin-bunga-duduk-mohd-hasan.jpg` | mohd hasan | Pexels |
| `mas-kahwin-sabah-sarawak` | `S-pasangan-baju-oren-azman-aziz.jpg` | Azman Aziz | Pexels |
| `mas-kahwin-melebihi-kadar-minimum` | `S-pengantin-melayu-pelamin-fyruz-alqadiri.jpg` | Fyruz Alqadiri | CC BY-SA 4.0 |

**Reuse:** two photographs carry two articles each — `S-kompang-gendang-johor`
also covers `checklist-kahwin` (P6), and `S-pasangan-baju-oren-azman-aziz` also
covers `taaruf-maksud` (P7). Both were already recorded as reuse by the
Managing Editor. No photograph is reused **within** C2.4: all eight covers are
distinct, which was not required but is what the pool allowed.

**Two alt strings were wrong against the actual image and were rewritten.**

1. **`mas-kahwin-ikut-negeri`** ended `"Dua ahli keluarga berdiri di kiri dan
   kanan sambil mengipas mereka."` There are no attendants in that frame — it
   is a tight two-shot. The sentence had been copied from the article's own
   **in-article** image, `S-bersanding-pelamin-mohd-hasan.jpg`, where two people
   genuinely do fan the couple with white feather fans. The cover also shows a
   beaded tiara the alt never mentioned. Rewritten to the frame that is there.
2. **`mas-kahwin-melebihi-kadar-minimum`** said the groom was `berdokoh emas`.
   Viewed at full size, the gold is **embroidery down the placket and across the
   shoulder**, not a dokoh — and a `dokoh` is a specific traditional pendant the
   style guide requires us to use correctly. The bride's gold crown, the most
   prominent thing in the upper frame, was unmentioned. Rewritten.

Both are the same defect the `human-covers-everywhere` log criticised and then
committed itself: *"writing a description of an image I had not looked at."*
Third occurrence in three runs.

**Six alt strings were checked and cleared**, which is worth as much as a
correction: `mas-kahwin-johor` (the pink `gerbang bunga manggar` is genuinely
there, zoomed to confirm), `mas-kahwin-kelantan-terengganu` (family really are
carrying dulang hantaran), `mas-kahwin-perak`, `mas-kahwin-pahang-negeri-sembilan`,
`mas-kahwin-sabah-sarawak`, `apa-itu-mas-kahwin`.

**One honest weakness, already on the record and left standing:**
`mas-kahwin-perak`'s photograph is from Melor, **Kelantan**, on an article about
**Perak**. The subject is generic kampung wedding music and the caption names the
real location rather than hiding it — `"Muzik tradisional pada majlis kampung.
Gambar di Melor, Kelantan."` It is the weakest placement in the set. It is not
culturally wrong, which is the rule that beats the count.

## The command

```
pnpm --silent ingest <file>.md --db "$DB" --commit --update --publish --revalidate-url https://hellokahwin.com
```

`--update` because the rows exist. **`--publish` is not optional here:** the
files say `status: published`, and without the flag `effectiveStatus` falls to
`draft` — an `--update` run without it would have **unpublished eight indexed
articles**. `$DB` was read out of `.env` into a shell variable so the URL never
appeared in a command line. All runs exited 0 and every one reported *"Content
caches dropped."*

## Proof

Final write **11:06:38Z**. The Vercel edge TTL is 300s, so nothing before
11:11:38Z is evidence. Cache headers are recorded on every request, because a
stale 200 and a fresh 200 are otherwise identical.

### Why three passes, and why the first two are shown rather than hidden

**Pass 1 (11:12:23Z) reported `og:image: (none)` on all eight — and it was my
extraction that was broken, not the site.** Next streams `generateMetadata`
output far past the shell, so the og tags sit deep in the document; a head-only
match finds nothing on a page that has one.

**Pass 2 (11:14:14Z) exposed a real defect, and my first diagnosis of it was
wrong.** Six of eight came back `x-vercel-cache: STALE` with `age` 326–355, and
those six carried the **site-level default title** and no og tags at all:

```
apa-itu-mas-kahwin   STALE  age 355   TITLE: HelloKahwin — Idea & Panduan Perkahwinan Malaysia   og:image: (none)
mas-kahwin-johor     HIT    age  47   TITLE: Mas kahwin Johor 2026: RM22.50…              og:image: …crop-16x9-og.webp
```

I first recorded that as "STALE means no metadata". **That is not right**, and
later sampling disproved it: `mas-kahwin-perak` at `STALE age=385` and
`mas-kahwin-ikut-negeri` at `STALE age=443` both returned a complete document
with `og:image` present. Staleness is not the variable. See
"Article routes intermittently render a COMPLETE page with no metadata block"
below for what actually is.

What does hold, and is the operational rule: **a response that is missing its
metadata is missing its whole tail, and must never be read as evidence about
content.** Reported at face value, pass 2 says "six of eight lost their
metadata" — false, and the obvious fix is destructive.

### Pass 3 — the eight URLs, all fresh, all cached after the final write

```
URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri
AT (UTC):       2026-08-25T11:14:36.299Z    STATUS: 200    x-vercel-cache: HIT   age: 78
og:image:       …/inspire/mas-kahwin-ikut-negeri/1787655861515-images-s-pengantin-merah-jambu-pelamin-mohd-hasan/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin
AT (UTC):       2026-08-25T11:14:36.726Z    STATUS: 200    x-vercel-cache: HIT   age: 21
og:image:       …/inspire/apa-itu-mas-kahwin/1787655885049-images-s-pengantin-putih-jambangan-azman-aziz/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-johor
AT (UTC):       2026-08-25T11:14:36.769Z    STATUS: 200    x-vercel-cache: HIT   age: 69
og:image:       …/inspire/mas-kahwin-johor/1787655906237-images-s-kompang-gendang-johor-stress043/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-kelantan-terengganu
AT (UTC):       2026-08-25T11:14:36.834Z    STATUS: 200    x-vercel-cache: HIT   age: 21
og:image:       …/inspire/mas-kahwin-kelantan-terengganu/1787655919682-images-s-arak-pengantin-kelantan-malexi/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-perak
AT (UTC):       2026-08-25T11:14:37.096Z    STATUS: 200    x-vercel-cache: HIT   age: 20
og:image:       …/inspire/mas-kahwin-perak/1787655932835-images-s-muzik-tradisional-kenduri-malexi/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-pahang-negeri-sembilan
AT (UTC):       2026-08-25T11:14:37.141Z    STATUS: 200    x-vercel-cache: HIT   age: 21
og:image:       …/inspire/mas-kahwin-pahang-negeri-sembilan/1787655944898-images-s-pasangan-pelamin-bunga-duduk-mohd-hasan/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-sabah-sarawak
AT (UTC):       2026-08-25T11:14:37.193Z    STATUS: 200    x-vercel-cache: HIT   age: 21
og:image:       …/inspire/mas-kahwin-sabah-sarawak/1787655958140-images-s-pasangan-baju-oren-azman-aziz/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no

URL:            https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-melebihi-kadar-minimum
AT (UTC):       2026-08-25T11:14:37.237Z    STATUS: 200    x-vercel-cache: HIT   age: 20
og:image:       …/inspire/mas-kahwin-melebihi-kadar-minimum/1787655971879-images-s-pengantin-melayu-pelamin-fyruz-alqadiri/crop-16x9-og.webp
  kad-tajuk in og:image? no      kad-tajuk anywhere in page? no
```

**Eight for eight: 200, fresh, photograph `og:image`, and the string `kad-tajuk`
does not appear anywhere in any of the eight documents.** Every `age` is smaller
than the 478s since the final write, so every cache entry was created after it.

### The rendered credit line, quoted verbatim from live HTML

The cover credit on `/artikel/hantaran-mas-kahwin/mas-kahwin-johor`, a followed
link to the source file on Wikimedia Commons:

```html
<p class="text-muted-foreground mt-2 text-right text-xs"><a href="https://commons.wikimedia.org/wiki/File:Gendang_Perkahwinan_di_Johor.jpg" class="underline underline-offset-2 transition-opacity hover:opacity-80" target="_blank" rel="noopener noreferrer">Kredit: Stress 043 (CC BY-SA 4.0)</a></p>
```

And an in-article figure on the same page, caption and credit joined by the
en dash `creditLine()` inserts:

```html
<a href="https://www.flickr.com/photos/88758808@N00/411419749" class="transition-opacity hover:opacity-80" style="color:white" target="_blank" rel="noopener noreferrer">Angka RM22.50 itu hanya bermakna pada saat ini: ketika ia diserahkan, di hadapan orang yang mengakadnikahkan. — Kredit: MyLifeStory (CC BY 2.0)</a>
```

### The og:image proof, re-taken with a browser user agent

Re-run after review challenged it, because a claim this load-bearing should not
rest on one tool's default UA. Full body read, cache state recorded, plus two
controls this run never touched:

```
C2.4 (this run)  200  STALE  age=443  bytes=136759  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-ikut-negeri
C2.4 (this run)  200  STALE  age=386  bytes=113244  og:image=YES  title=article  kad-tajuk=none   apa-itu-mas-kahwin
C2.4 (this run)  200  HIT    age=24   bytes=106445  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-johor
C2.4 (this run)  200  STALE  age=386  bytes=113809  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-kelantan-terengganu
C2.4 (this run)  200  STALE  age=385  bytes=104406  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-perak
C2.4 (this run)  200  STALE  age=386  bytes=111133  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-pahang-negeri-sembilan
C2.4 (this run)  200  STALE  age=386  bytes=112332  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-sabah-sarawak
C2.4 (this run)  200  STALE  age=385  bytes=110057  og:image=YES  title=article  kad-tajuk=none   mas-kahwin-melebihi-kadar-minimum
P1 control       200  STALE  age=301  bytes=111903  og:image=YES  title=article  kad-tajuk=none   rukun-nikah
P6 control       200  STALE  age=345  bytes=93121   og:image=NO   title=GENERIC     kad-tajuk=none   bajet-kahwin
```

**Eight for eight, `og:image` is present and is the photograph**, under a real
browser UA, on both stale and fresh responses. The `kad-tajuk` string appears
nowhere in any of the eight — cover or body — which is the check the corrected
directive requires, grepped from the rendered page rather than from the row.

### Article routes intermittently render a COMPLETE page with no metadata block — PRE-EXISTING, and its own brief

**I got this wrong twice before measuring it properly, and both wrong versions
are recorded above and here on purpose**, because each wrong diagnosis sends a
different person to fix a different thing.

- **First wrong version:** "STALE responses lose their metadata." Disproved —
  `mas-kahwin-perak` at `STALE age=385` returned a complete document with
  `og:image`.
- **Second wrong version, mine:** "the response is truncated." **I asserted a
  missing `</html>` I had never measured.** The closing-tag check lived in a
  later script in which every sample happened to be healthy; I carried the
  conclusion back onto an earlier sample that was never tested for it. Review
  challenged it and was right.

Measured properly — both markers on the same sample, 24 requests across four
articles, `cache-control: no-cache`:

```
P6 bajet-kahwin  t1 REVALIDATED age=0    bytes=103550  meta=4   og=0  </html>=YES  title=GENERIC   <-- DEGRADED
P6 bajet-kahwin  t2 STALE       age=379  bytes=107981  meta=27  og=9  </html>=YES  title=article
P1 rukun-nikah   t1 HIT         age=108  bytes=100629  meta=4   og=0  </html>=YES  title=GENERIC   <-- DEGRADED
P1 rukun-nikah   t2 HIT         age=108  bytes=100629  meta=4   og=0  </html>=YES  title=GENERIC   <-- DEGRADED
   … t3–t6 identical, six for six
C2.4 johor       t1 REVALIDATED age=0    bytes=107265  meta=23  og=9  </html>=YES  title=article
C2.4 johor       t2 STALE       age=411  bytes=106445  meta=23  og=9  </html>=YES  title=article
C2.4 perak       t1 REVALIDATED age=0    bytes=100571  meta=4   og=0  </html>=YES  title=GENERIC   <-- DEGRADED
C2.4 perak       t2 STALE       age=389  bytes=104406  meta=23  og=9  </html>=YES  title=article

healthy=16  degraded=8
```

**Every degraded response carries a closing `</html>`.** They are complete,
well-formed documents. Nothing is truncated. The real signature is
**4 meta tags against 23–27, zero `og:` properties against nine, and the root
layout's generic `<title>` — while the article content renders normally** (the
`desktop-hero` webp is present in both states).

**What this actually is:** `generateMetadata` intermittently fails or times out
at render time, the root layout's fallback metadata is emitted instead, and the
document then completes normally. **Content path healthy, metadata path failed.**

**Why the distinction decides who can fix it:** "responses are truncated" sends
someone to the CDN, the proxy or the stream, where they will find nothing,
because the response is intact. This is a server-render fault in
`generateMetadata`.

**And it is not a rare transient — a degraded render gets CACHED.** `rukun-nikah`
served the identical 100,629-byte metadata-less document six times in a row at
`HIT age=108`. Three of the four degraded first-hits are `REVALIDATED age=0`,
which is the fresh render from origin: the origin produces the bad document and
the edge then stores it and serves it to everyone — crawlers included — for the
rest of the TTL.

**Why it matters more than the job I was sent to do:** a crawler that catches a
cached degraded copy sees no `og:image`, no `og:title` and a generic title, so
every share of that article falls back to whatever the crawler guesses and the
cover work above is invisible to social and to some SEO tooling.

**Not fixed here — deliberately.** The brief is covers only, and this touches
every route on the site. **Recommended as its own brief, titled for the actual
defect:** *"article routes intermittently serve a complete response with the
metadata block missing (4 meta tags vs 23–27, root-layout title fallback,
content intact) — and the bad render is cached."* The P1 and P6 samples are the
evidence that it is pre-existing and independent of this change.

One loose end for that brief: an earlier `bajet-kahwin` sample measured 93,121
bytes, smaller than any degraded response here. It was **not** checked for
`</html>` at the time and cannot now be claimed as truncation. Worth including
as an open question, but it must not name the brief.

### All eight URLs unchanged

Same row `id`, same `slug`, therefore the same URL. The slug is the conflict key
and was never written to.

```
apa-itu-mas-kahwin                fc26f9b1-f4ba-4982-8a26-558ba74d14b8
mas-kahwin-ikut-negeri            b1484478-a5b5-44ce-85c2-10f2c2a32d0c
mas-kahwin-johor                  d662bad6-eab7-4d77-bcdc-abcec603a3ec
mas-kahwin-kelantan-terengganu    b62d35d0-9d88-4174-9aae-1c05ef5fac59
mas-kahwin-melebihi-kadar-minimum b2191993-232b-4be5-b516-d20b6cc3a3ab
mas-kahwin-pahang-negeri-sembilan 99d59b25-a0fa-4108-94b4-7ff774bb064e
mas-kahwin-perak                  abec9ae7-d323-4f11-9e69-17b610ae281c
mas-kahwin-sabah-sarawak          d2df8447-d314-4699-88b8-685502e28389
```

All eight `canonical` tags on the live pages equal the requested URL, and all
eight appear in `sitemap.xml` (69 `<loc>` entries).

### `jsonb_typeof(content)` — before and after

```
BEFORE 2026-08-25T10:52:57Z   whole table: {"object": 53}   zero string rows
AFTER  2026-08-25T11:07Z      whole table: {"object": 53}   zero string rows

every jsonb column on the eight, after:
  content object · cover_image_variants object · cover_image_smart_crops object
  cover_image_focal_point object · cover_image_detection_data object
```

The double-encoding fix held. It was not made worse and it was not undone.

### Readers do not receive the originals

```
slug                              original      high.webp   crop-16x9-og
apa-itu-mas-kahwin                200/1153KB    200/259KB   200/232KB
mas-kahwin-ikut-negeri            200/2075KB    200/228KB   200/254KB
mas-kahwin-johor                  200/6246KB    200/301KB   200/307KB
mas-kahwin-kelantan-terengganu    200/2049KB    200/373KB   200/384KB
mas-kahwin-melebihi-kadar-minimum 200/11569KB   200/757KB   200/343KB
mas-kahwin-pahang-negeri-sembilan 200/3494KB    200/555KB   200/410KB
mas-kahwin-perak                  200/2313KB    200/475KB   200/381KB
mas-kahwin-sabah-sarawak          200/2244KB    200/377KB   200/367KB
```

The 11.5 MB `melebihi-kadar-minimum` original is never served; the page links
the 343 KB og crop and the 757 KB high variant.

## The text cards: removed, not moved — and why this run did it twice

**The brief was rewritten on disk at 10:56:21Z, while this run was mid-commit.**
The version it was dispatched with said *"Keep the `kad-tajuk` card — move it
in-article, do not delete it"*, on image-pack evidence. The version now on disk
says the opposite:

> **REMOVE the `kad-tajuk` card entirely — do NOT move it in-article.** Owner
> directive, 25 Aug: *"No i do not want a text card, it looks ugly. Find
> alternatives, no text card at all."*

`aug-23-2026-workflow-content-production.md` was updated 21 seconds later with
the matching standing rule, **NO TEXT CARDS. ANYWHERE.**, explicitly superseding
the image-pack position.

All eight had already been published with the card moved in-article. It was
found by opening the workflow file for the retrospective edit — **not by any
notification.** Corrected: the `kad-tajuk` entry was removed from all eight
files, the prose-identity check was re-run and still passed on all eight, and
all eight were re-ingested. Verified in the database:

```
slug                               coverIsCard  cardInBody  figures  content  status
apa-itu-mas-kahwin                 false        false       3        object   published
mas-kahwin-ikut-negeri             false        false       3        object   published
mas-kahwin-johor                   false        false       1        object   published
mas-kahwin-kelantan-terengganu     false        false       1        object   published
mas-kahwin-melebihi-kadar-minimum  false        false       3        object   published
mas-kahwin-pahang-negeri-sembilan  false        false       1        object   published
mas-kahwin-perak                   false        false       1        object   published
mas-kahwin-sabah-sarawak           false        false       1        object   published
```

The PNGs are kept on disk and the old R2 objects were not deleted. Nothing
references them.

## A concurrent session was editing the same files

All eight `drafts/ingest/*.md` were rewritten at **10:55:46Z**, 44 seconds into
the commit run, by the parallel supporting-images work. A1/A2/A3 committed
against the pre-10:55:46 files and A4–A8 against the post version, so three rows
lagged. **Ingest is whole-file — there is no way to write only the cover** — so
the three were re-run against the settled files, and a live-versus-file drift
check now reports `MATCHES` on all eight with `Need re-run: (none)`.

The five MyLifeStory photographs that rode along were **not** in the asset
register when first checked, which would have been an owner-rule breach. They
are now — `HK-P-0034`…`HK-P-0038`, all `boleh-guna`, `license_class: S`. The
concurrent session filed them while this run was in progress. The gap closed
itself; it was a timing artifact, not a defect.

### The withdrawn directive came back, 15 minutes after it was removed

**At 11:08:24Z the concurrent session rewrote all eight files again and
re-inserted the `kad-tajuk` block** — the very thing the owner had withdrawn and
this run had just stripped at 11:04. It came back with a *stronger* authority
citation than the one it replaced:

```yaml
  # Kad tajuk yang dahulunya menjadi cover, dipindahkan ke dalam artikel
  # mengikut arahan pemilik 25 Ogos 2026. Alt teks ini yang diluluskan lembaga
  # 24 Ogos 2026 (ruling 3); jangan tulis semula tanpa melalui lembaga.
  - file: mas-kahwin-johor-kad-tajuk.png
```

Two attributions now — the owner *and* the editorial board — plus an explicit
instruction not to rewrite it. Every clause is true in isolation: the board did
approve that alt text on 24 Aug. It is the **entry** that was withdrawn on
25 Aug, which makes the board's approval of its alt text irrelevant, and the
comment gives a reader no way to see that.

**Production was not affected.** The last ingest was 11:06:40Z, before the
rewrite, and the eight rows were re-verified afterwards: `card_cover=false`,
`card_body=false` on all eight. The files were the landmine, not the pages —
the next `--update` from them would have re-applied the withdrawn card.

Stripped again, and **no re-ingest was needed**: a live-versus-file check after
the strip returns `MATCHES` on all eight with the note *"No write needed — the
stripped files already describe what is live."* Zero extra writes on a
zero-backup database.

**This is the rule from the retrospective failing in real time, 15 minutes after
it was written.** Stripping a file cannot hold while another seat is generating
it from a source that still carries the withdrawn instruction. The durable fix
is upstream — in whatever produces these files — not in the file.

## Asset register, both directions

- **Eight photograph rows** (`HK-P-0003`, `0018`, `0022`–`0027`): `r2_key`
  filled with the live cover key, the slug added to `digunakan_dalam`, and a
  note recording that it is the live cover since 25 Aug 2026 and that readers
  receive the variants rather than the original.
- **Eight card rows** (`HK-C-0001`–`HK-C-0008`): `status_guna` moved to
  **`jangan-guna`**, `digunakan_dalam` emptied, `r2_key` set to
  `TIDAK BERKENAAN`, and a note carrying the owner's directive verbatim, that
  the card was removed from the page rather than moved into it, that the PNGs
  and old R2 objects are retained, and that the state data survives as markdown
  tables in the body so the reader loses nothing.

The register was re-read immediately before each write and went from 741 rows to
771 during the run — 30 added by the concurrent session, all preserved.

## Not changed, and worth saying

- **`meta_title` on `mas-kahwin-ikut-negeri`** is a legacy WordPress field
  holding `"Mas Kahwin Ikut Negeri: Negeri Mana Paling Tinggi & Paling Rendah?"`,
  which is what the `<title>` renders — not the `articles.title` this run wrote.
  Ingest does not write `meta_title` and did not touch it. It is the only one of
  the eight that has one. Flagged for the SEO lead, not fixed here.
- **No article text, no URL, no internal link** was edited. The only front-matter
  edits were the two alt strings and the removal of the eight card entries.

## Still open

- **The Vercel edge is still not purged at ingest time.** Same finding as the
  P1/P6 run, unchanged: `--revalidate-url` clears the Next data cache inside the
  origin and nothing clears the edge in front of it.
- **Superseded R2 objects and media rows.** Each re-ingest writes a new
  timestamped key, so this run left several generations of orphans. They are
  unreferenced, not broken, and deliberately not deleted — the keys are served
  `immutable`.
- **All eight are `review_status: pending_review`**, as every ingested article
  is.
