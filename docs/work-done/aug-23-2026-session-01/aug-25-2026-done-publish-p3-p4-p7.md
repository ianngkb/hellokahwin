# P3, P4 and P7 published — nine articles live, six pillars of seven — 25 Aug 2026

**Session:** aug-23-2026-session-01 · **Owner:** BMAD · **Status:** completed
**Plan:** [aug-25-2026-brief-publish-p3-p4-p7.md](../../plans/aug-23-2026-session-01/aug-25-2026-brief-publish-p3-p4-p7.md)

## What was done

Nine board-cleared articles ingested into the production database and published
— three into P3 `/artikel/ucapan-doa/` (ucapan-pengantin-baru,
doa-pengantin-baru, doa-majlis-perkahwinan), three into P4
`/artikel/busana-pengantin/` (baju-pengantin-sewa-atau-beli,
songket-tenunan-tangan-atau-cetak, inai-tangan-pengantin) and three into P7
`/artikel/sebelum-nikah/` (cincin-tunang, taaruf-maksud,
doa-majlis-pertunangan).

**The site went from three live pillars to six of seven.** P5 was not touched:
zero rows published under `pelamin-kad-cenderahati` before the run and zero
after, and no P5 file was ingested, staged or named in any command.

An undo record was written before the first write, since production runs
`pitr_enabled=false` with no platform backups. Nothing was rolled back — it was
never needed.

## Nine, not ten

The brief's prose says "ten verified articles"; its scope table lists **nine**.
The tenth was `C5-2-A1-contoh-kad-jemputan-kahwin`, which the same brief blocks
two paragraphs later along with the rest of P5 — the count had been carried
across from the twelve-article verification batch and never re-derived after P5
was cut. The brief's proof target, 57 → 70, was arithmetic on the wrong figure.

**Nine was published; the sitemap target is therefore 57 → 69 (+12), and that
is what was measured.** Nothing was published to make the brief's number true.

## The two blockers the brief did not mention

A dry run of all nine against production, before any write, refused six of them.

**1. Nine declared graphics that had never been rendered.** Six of the nine
articles name `licenseClass: G` HelloKahwin graphics — with a full credit chain
and a real spec in `aug-25-2026-map-article-to-graphic.md` — that do not exist
as files. Ingest refuses a file with an unresolved image, so six finished,
board-cleared articles were unpublishable. The four templates they call for
(`jadual-perbandingan`, `grid-kategori`, `garis-masa`, `kad-senarai-semak`)
exist only as a spec.

This was **already written down**: `aug-25-2026-done-human-covers-everywhere.md`
§7 records it as "not mine to unblock". The brief, written after that log, said
the ten were ready to publish.

**Decision: the nine articles shipped without the nine graphics.** Three
reasons — the declared alt text describes those specific templates, so drawing
substitutes with the existing data-card renderer would have put alt text on the
page that does not match its pixels (a defect this session already fixed twice
today); every affected article already prints the same figures as a real
markdown table in its body, so nothing was lost from the page; and building four
templates is a specced, owned, different brief. Every omission is listed by name
in the build log as an `--update` list.

**2. `P7-A3` declared an internal link to a pillar hub.**
`internalLinks: - slug: hantaran-mas-kahwin` — a live, indexed URL, but a
*category*, not an article, so it can never resolve and it refused the file.
The verification board flagged it as "worth a dry run"; the dry run was not
taken until publish day. Dropped at zero cost: `internalLinks` is validated and
never rendered.

## Decisions the brief asked to be settled

- **Cover path convention: relative to the article file, no `./` prefix** — the
  same convention as the P1/P6 run, and it was already satisfied. Zero `./`
  prefixes in the nine files; all twelve real image references resolved on disk.
  Nothing was edited to comply. The staging copies carry `../images/…` because
  they sit one directory below the originals and paths resolve against the
  article file; this was verified to derive a byte-identical R2 key, not
  assumed.
- **The `articles.content` double-encoding bug was already fixed** and verified
  against the database before ingesting: `[{"t":"object","count":"44"}]`, zero
  `string` rows, before. After: 53 rows, all `object`, and every jsonb column on
  all nine new rows plus all twelve media rows reads `object`. No bad rows
  written.
- **Ingest order was not constrained.** The brief said the nine "cross-link
  within their own pillars and to the eight P1/P6 articles"; **neither half is
  true.** All three distinct link targets were already-published P2 or legacy
  articles, zero cross-links inside the batch, and not one link to a P1 or P6
  page — which the verification log had already stated. Order was chosen for
  failure containment: one pillar complete before the next began.

## Evidence

Full technical log, with every literal request and response, lives with the code
that produced it: **`docs/work-done/2026-08-25-publish-p3-p4-p7.md`** in the
site repo (`hellokahwin-site`). Undo record beside it at
`docs/work-done/2026-08-25-publish-p3-p4-p7-UNDO.md`.

Headline numbers, all measured against production:

| | Before | After |
|---|---|---|
| `sitemap.xml` URLs | 57 | **69** |
| Published articles | 44 | **53** |
| Pillars with live articles | 3 (P1, P2, P6) | **6 (P1, P2, P3, P4, P6, P7)** |
| `/artikel/ucapan-doa` | `noindex, follow` | **no robots meta — indexable** |
| `/artikel/busana-pengantin` | `noindex, follow` | **no robots meta — indexable** |
| `/artikel/sebelum-nikah` | `noindex, follow` | **no robots meta — indexable** |
| `media` rows | 667 | 679 |
| `inspire_tags` | 22 | 56 (+34, exactly as predicted) |

All nine new URLs returned **200 on their first ever request**, cold
(`x-vercel-cache: MISS`, `age: 0`), with no `noindex` anywhere in the document.
Each pillar hub links exactly its three articles. All twelve uploaded images and
all nine covers return 200 from `images.hellokahwin.com`. Credits render in the
licensor's own wording, linked to source:

```html
<a href="https://commons.wikimedia.org/wiki/File:Majlis_Doa_Selamat_Pernikahan_Diraja_Raja_Muda_Selangor_010.jpg" …>Bacaan doa dalam majlis. Siapa yang membaca dan berapa lama ia dibaca adalah urusan aturcara majlis, bukan tuntutan agama. — Kredit: Ahmad Ali Karim (CC0)</a>
```

No existing article row was touched — the check for pre-existing rows with
`updated_at` after the run start returned empty — and no existing URL changed.
No article text, alt text, caption, credit or meta description was edited; the
body of every staging copy was asserted byte-identical to the approved draft.

## What it changed

The site went from **three live pillars to six of seven**. Three pillar hubs
that Google was being told not to index are now indexable and in the sitemap,
and twelve new URLs are crawlable. P5 remains the only pillar with no live
article, deliberately.

## Retrospective

*Stage 9. Second run under the rule. Written here, in the company entry, which
is where the last run's own retrospective established that it belongs.*

### 1. What did we learn that is not already written down?

**A declared image is not a delivered image, and no gate checked.** Stage 6b's
gate reads *"every image has its full credit chain"*. Nine graphics had a
perfect credit chain — `credit`, `creditUrl`, `licenseClass: G`,
`licensorName`, and a template named in the article-to-graphic map — and zero
bytes on disk. Six board-cleared articles were therefore unpublishable, and
**nothing in the workflow said so.** Checking the credit on an image that does
not exist is checking the wrong thing first.

The 30-second test existed the whole time. `pnpm --silent ingest <file> --db
"$DB"` with no `--commit` resolves every image path, every internal link and
both categories against the real database and writes nothing. It was written
down as a Stage 7 step. **It is a Stage 6b handover gate**, and it is now.

**`internalLinks` is validated, never rendered.** Nobody had written this down.
The script reads the list twice — once to check each slug resolves, once to
print a count — and never writes it to the database. It matters because it turns
"one front-matter entry is blocking nine articles" from a dilemma into a
non-event: dropping it costs a reader nothing. Now on `internalLinkSchema`.

**A pillar hub slug can never resolve in `internalLinks`, and that reads as a
contradiction.** `/artikel/hantaran-mas-kahwin` is live, indexed and in the
sitemap, and is unusable as an `internalLinks` target, because hubs live in
`inspire_categories` and the resolver queries `articles`. Anyone who does not
know the table layout will read the refusal as a broken link on a working page.
The refusal message now detects the case and says so.

**The brief's warnings scored one real, two phantom — and missed both blockers
that actually stopped the run.** Same shape as the P1/P6 run, sharper:

| The brief's warning | What actually happened |
|---|---|
| Cover path convention needs settling | **Phantom.** Zero `./` prefixes in the nine files. Settled identically to last run, nothing edited. |
| `content` double-encoded as jsonb `string` | **Phantom now, real historically.** Fixed by `12182d6`; verified `object`-only before and after. |
| The nine cross-link to each other and to P1/P6 | **Phantom, and contradicted by a document the brief cited.** Zero intra-batch links; zero links to P1 or P6. |
| — | **REAL, unmentioned:** nine declared graphics do not exist. Refused six of nine. |
| — | **REAL, unmentioned:** `P7-A3` links to a category. Refused one of nine. |

The lesson is sharper than "test the warnings cheaply". **Both real blockers
were already recorded in documents this brief cited** — the graphics gap in
`aug-25-2026-done-human-covers-everywhere.md` §7, the hub link in
`aug-25-2026-done-verify-p3-p4-p5-p7.md` §3. A blocker recorded as prose in one
run's log does not stop the next brief being written as if it did not exist.
**Findings have to graduate from a run log into a gate, or they get rediscovered
at the cost of a run.**

**And a correction to something we did write down.** The P1/P6 retrospective
concluded: never baseline the URL whose after-state is the proof. Necessary, and
**not sufficient.** This run took no baseline on any of the three pillar hubs,
and all three still served a pre-write copy on the first request —
`x-vercel-cache: STALE`, `age: 666`, `noindex` intact, 379 seconds after the
last write. The edge had a copy from a visitor or platform crawl at ~10:41Z that
nobody in this run caused. **The second-request procedure is not a remedy for
our own mistake; it is the normal case for any URL the public can reach.**

### 2. Which document must change, and who owns the edit?

| File (path) | Edit | Owner | Status |
|---|---|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` (docs repo) — **Stage 6b** | New section *"A declared image is not a delivered image"*: declared files must exist as bytes; the two-run cost stated; the dry run named as the handover proof; instructions for handing over an article whose graphic genuinely cannot be rendered. **Gate rewritten** to require a passing dry run. | BMAD, this run | **Edited** |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` — **Stage 7** | `internalLinks[].slug` must be an article slug, never a hub; `internalLinks` is validated-never-rendered; the staging-copy pattern with its four permitted changes and the byte-identical-body assertion; "two batches, two briefs predicting cross-links, zero found". | BMAD, this run | **Edited** |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` — **Stage 1** | New section *"A publish brief's scope table is the count of record"*: prose numbers are derived from the table, and cutting scope means re-deriving the count, the sitemap delta and the pillar arithmetic in the same edit. Gate extended. | BMAD, this run | **Edited** |
| `src/lib/inspire/article-file.ts` (site repo) | `internalLinkSchema` documented: article slugs only, why a hub cannot resolve, why the body is the place to link one, and that the list is validated and never rendered. | BMAD, this run | **Edited** |
| `scripts/ingest-article.mts` (site repo) | `image not found` now prints the **resolved** path and names both causes (never-rendered graphic vs. path relative to the wrong directory). The `internalLinks` refusal now queries `inspire_categories` and, on a hit, says the slug is a category hub and what to do instead. | BMAD, this run | **Edited** |

`pnpm --silent typecheck` clean; `pnpm --silent vitest run src/lib/inspire`
83 tests pass.

**Still owed, and not this run's to make:** the four graphic-kit templates in
`docs/plans/aug-23-2026-session-01/aug-25-2026-spec-graphic-kit-remaining-templates.md`.
Nine graphics on six live articles are waiting on them, and the list is in the
build log ready for `--update`.

### 3. What did we do twice that we should never do again?

**Rediscovered the missing-graphics blocker from scratch, three hours after it
was recorded.** The covers run found it, wrote it into §7 of its log as "not
mine to unblock", and put it on a follow-up list. A brief was then written
saying the ten were ready. This run found it again — by running a dry run and
reading refusal messages — and spent the first part of its budget re-deriving
what template each of nine PNGs needed. **The fix is not "read harder": it is
that a blocker belongs in the gate of the stage that owns it**, which is what
the Stage 6b edit does.

**Wrote a publish brief asserting an internal cross-link dependency that does
not exist — for the second consecutive batch.** P1/P6's brief said it; the eight
did not cross-link. This brief said it, and named the P1/P6 articles as
targets; the nine do not cross-link and not one of them links to a P1 or P6
page. Worse, the verification log had already stated *"No article in this batch
links to a P1 or P6 page"* in plain words. Stage 7 now says: resolve the list,
do not design the ordering exercise.

**Nearly copied an undo template whose central assumption had expired** — see
question 4.

### 4. What did we nearly ship that we caught?

**A false failure report on all three pillar hubs.** Three 200s with
`<meta name="robots" content="noindex, follow"/>` still on them, 379 seconds
after the last write. Reported as-is that reads *"the publish did not work"*,
and the plausible next moves are re-running ingest with `--update` against
production or executing the undo — both destructive responses to a publish that
had already fully succeeded, against a database with `pitr_enabled=false` and
zero platform backups.

**What caught it:** the proof script computes `age` against seconds-since-last-
write and prints the contradiction itself — `!! age 666 EXCEEDS the 379s since
the last write — this is a PRE-WRITE copy`. On the P1/P6 run the same reading
had to be diagnosed by hand from two numbers in a log. **Mechanising the
arithmetic is the improvement**; recording the headers was already policy, but a
header you have to do mental arithmetic on is a header you can misread at the
end of a long run.

**An undo document that would have stripped tags off eight live articles.** The
P1/P6 undo deletes every tag slug its batch mentions, and it is correct to,
because `inspire_tags` held **zero** rows before that run. This batch mentions
36 tag slugs and the table held **22** rows: `akad-nikah` and `kos-kahwin`
already existed and belong to live P1/P2/P6 articles. Copying the previous
undo's shape would have produced a recovery procedure that silently damages
pages this run never touched — and an undo is run in a panic, by someone who
trusts it.

**What caught it:** querying which of the 36 already existed instead of
inheriting the previous run's assumption. The two are now called out by name in
the undo document, and `.tmp-ops/undo-p3-p4-p7.mjs` refuses to run if either
appears in its delete list. **A worked example is a template for the reasoning,
never for the values.**

**Nine articles shipping nine graphics short, with no record of which.** What
caught it: the staging script reports every entry it drops, by name, so the
`--update` list wrote itself instead of needing reconstruction later.

**A misreported proof number.** The brief asked for 57 → 70; the true target was
57 → 69. Reported against the brief's figure, a correct run looks like a failed
one. Caught by re-deriving the count from the scope table before anything was
written, not after the sitemap disagreed.

## Follow-ups

- **The four graphic-kit templates** — `jadual-perbandingan`, `grid-kategori`,
  `garis-masa`, `kad-senarai-semak`. Nine graphics on six **live** articles are
  waiting. Spec:
  `docs/plans/aug-23-2026-session-01/aug-25-2026-spec-graphic-kit-remaining-templates.md`.
  Add the PNG, re-stage, `--commit --update`; the per-article list is in the
  build log.
- **P5 is still blocked and still the only pillar with no live article.**
  `C5-1-A1-pelamin` and `C5-4-A1-bunga-telur` need re-sourcing;
  `C5-2-A1-contoh-kad-jemputan-kahwin` is cleared and waiting for its siblings.
- **Stage 8 measurement** — `head-of-seo-content` checks all nine at 14 and 45
  days: **8 Sep** and **9 Oct 2026**.
- **All nine sit at `review_status: pending_review`** in the owner's queue, as
  every ingested article does. Live and awaiting review are not exclusive.
- **Ingest-time edge purge is still not built.** Every publish carries a window
  of up to 300 seconds where readers get the pre-write page, and — new this run
  — a URL the public can reach may need a second request even when nobody on the
  team baselined it. Documented with measurements in `src/lib/cache/purge.ts`.
- **Two near-duplicate cover photographs are now live together**, flagged by the
  covers run: `songket-tenunan-tangan-atau-cetak` (P4, live today) and
  `mas-kahwin-pahang-negeri-sembilan` (P2, live since 23 Aug) are two frames of
  what appears to be the same couple, same outfits, same pelamin, same
  photographer. Worth the SEO lead's glance now that both pillars are live.
