# Done — the eight live C2.4 covers are photographs, and the text cards are gone

**Date:** 25 Ogos 2026 · **Seat:** BMAD, site worktree
**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-swap-c24-covers-to-photos.md`
**Build log:** `docs/work-done/2026-08-25-swap-c24-covers-to-photos.md` (site repo)
**Undo:** `docs/work-done/2026-08-25-swap-c24-covers-UNDO.md` + `…-UNDO.sql` (site repo), written before the first write

Eight indexed articles under `/artikel/hantaran-mas-kahwin/` carried `kad-tajuk`
typographic cards as cover and `og:image`. All eight now carry a licensed
photograph of a Malaysian Malay wedding with a rendered credit chain, and the
text cards have been **removed from the pages entirely** rather than moved
in-article. **No URL changed. No article text changed.**

## Outcome

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

**No article kept a text card.** All eight covers viewed at full size before
shipping; none is a Western stock wedding. Two photographs are shared with
articles in other pillars (`checklist-kahwin`, `taaruf-maksud`); no photograph is
reused within C2.4.

Proof, live, first clean pass at 11:14:36Z (final write 11:06:38Z, edge TTL 300s):
all eight `200`, `x-vercel-cache: HIT` with `age` 20–78s, `og:image` a
`crop-16x9-og.webp` of the photograph, and the string `kad-tajuk` absent from
all eight documents. `jsonb_typeof(content)` was `{"object": 53}` before and
after — zero string rows. Full tables in the build log.

## Two premises in the brief were wrong

1. **The front-mattered files existed.** The brief said the C2.4 drafts have no
   YAML front matter so `--update` was impossible. True of
   `drafts/A1..A8-*-REVIEWED.md`, false of `drafts/ingest/A1..A8-*.md`, which
   already carried the approved covers. The `human-covers-everywhere` log records
   why they never shipped: *"blocked behind the `articles.content`"* defect —
   closed by commit `12182d6`. **The block was stale and the work was waiting.**
2. **Rebuilding a file from the live JSON would have destroyed content.**
   `figureBlock` is a custom node markdown cannot produce, so a JSON → markdown
   → JSON round trip drops every in-article photograph and puts 11 state-data
   tables through a lossy conversion. Not needed once the source files were found.

## Corrections made to editorial work

**Two cover alt strings did not match their pixels** and were rewritten:
`mas-kahwin-ikut-negeri` claimed two family members fanning the couple — that
sentence belongs to the article's *in-article* image, not its cover;
`mas-kahwin-melebihi-kadar-minimum` called gold placket embroidery a `dokoh`, a
specific traditional pendant, and omitted the bride's gold crown. Six other alt
strings were checked at full size and cleared.

**`mas-kahwin-perak` remains the weakest placement**, knowingly: the photograph
is from Melor, Kelantan, on an article about Perak. The subject is generic
kampung wedding music and the caption names the real location. Not culturally
wrong, which is the rule that beats the count.

## Asset register, both directions

Eight photograph rows got their live `r2_key`, the slug in `digunakan_dalam` and
a cover note. Eight `HK-C-000x` card rows moved to `status_guna: jangan-guna`
with `digunakan_dalam` emptied and the owner's directive recorded verbatim. The
register grew 741 → 771 rows during the run from a concurrent session; all 30
were preserved by re-reading immediately before each write.

---

## Retrospective

### 1. What did we learn that is not already written down?

**A standard that changes after publication has no owner in this workflow.** The
cover rule changed on 25 Aug. P1 and P6 had not shipped, so they got photographs
and looked correct. The eight C2.4 articles had shipped the day before, so they
silently kept text cards — live, indexed, wrong — until a person hand-checked
every live `og:image` and wrote a brief. **Nothing in the workflow caused that
check.** The currency loop watches facts; the learning loop feeds forward into
the next brief; neither looks backward at pages already published.

**And the same failure happens at the scale of a single run.** The brief for
this work was rewritten on disk at **10:56:21Z, mid-commit** — item 4 reversed
from "keep the card, move it in-article" to "remove the card entirely" — and the
workflow gained the matching standing rule 21 seconds later. Eight articles had
already been published under the superseded instruction. It was found only
because the file was opened for an unrelated reason. **Editing a brief that is
being executed does not deliver the edit.**

**Two mechanical facts worth keeping.**

- **`jsonb` does not preserve object key order.** A `JSON.stringify` comparison
  against a jsonb column reports every text node in every article as changed.
  All eight articles came back `PROSE-DIFFERS` on the first check, which reads as
  "re-ingesting rewrites the whole cluster" and argues for abandoning `--update`.
  Canonicalise key order before comparing.
- **A `x-vercel-cache: STALE` response is not weak evidence, it is no evidence.**
  Six of eight STALE responses carried the **site-level default title** and no og
  tags at all. Reported at face value that says "six of eight lost their
  metadata" — false, and the obvious fix is destructive.

Also: **`--publish` is load-bearing on an `--update`.** The files say
`status: published`; without the flag `effectiveStatus` falls to `draft`, and the
run would have **unpublished eight indexed articles** while reporting success.

### 2. Which document must change, and who owns the edit?

| File | Edit | Owner |
|---|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` | **"The two standing loops" → "The three standing loops"**, adding the **Standards loop** and three subsections — see below | BMAD, **this run — the edit is done, not proposed** |

**The edit is made**, and it has three parts, because this run failed in three
distinct ways and only the third actually caused the damage.

1. **Standards loop.** A directive that changes a production standard is not
   applied until it carries a backfill list of every already-published URL that
   fails it, a named owner and date, and a re-check after the backfill ships.
   It also asks that standards be written so they can be *queried* — "covers are
   photographs" became checkable the moment it was
   `cover_image_url not like '%kad-tajuk%'` across every published row.
2. **A directive that changes mid-flight must reach the work in flight.**
   Editing a brief that is being executed does not deliver the edit; tell the
   running seat. And the run re-reads its brief before the final write.
3. **A withdrawn directive must not survive as a citation inside a build
   artefact.** *This is the one that caused the damage, and neither of the other
   two would have caught it.* The withdrawn instruction lived on in the eight
   ingest files as an approving comment citing the owner —
   `# ... mengikut arahan pemilik 25 Ogos 2026` — above the kad-tajuk block. A
   later run read a dated, owner-attributed instruction, had no way to know it
   was superseded, and executed it onto eight indexed pages. **The comment did
   not merely fail to stop the run; it vouched for the wrong behaviour.** The
   new rules: artefacts carry *what to do* and never *who approved it*;
   withdrawing a directive includes sweeping the artefacts built under it, by
   grepping `drafts/` and not only the docs; a run that finds a directive quoted
   in an artefact verifies it against the ruling document before acting; and
   — the concrete, machine-readable form of the other three —
   **the asset register must be READ before an artefact is regenerated, with
   `status_guna: jangan-guna` treated as a hard gate.** That guard already
   existed and already said the right thing when the cards came back at
   11:08:24Z: the eight `HK-C-000x` rows had been retired the moment they came
   off the pages. The regenerating run simply did not consult it. The register
   is the one copy that gets updated when a directive changes, which is what
   makes it the one to trust over any comment in a file.

### 3. What did we do twice that we should never do again?

**Written a description of an image nobody looked at — third run running.** The
`human-covers-everywhere` log criticised the run before it for exactly this,
then committed it one pass later and said so. This run found two more. The fix
is not more care; it is that **the person writing alt text renders the image at
full size first**, and a cover alt is never copied from a sibling image on the
same article — which is precisely how `mas-kahwin-ikut-negeri` acquired two
attendants who are not in the frame.

**Trusted a brief's factual premises instead of checking them.** The P1/P6 run
recorded the same lesson: *"the brief said the eight cross-link to each other…
Taken on trust, that would have produced an elaborate ordering exercise for a
dependency that does not exist."* This brief asserted no front matter existed;
one `ls` of `drafts/ingest/` disproved it and saved a dangerous JSON→markdown
round trip. **A brief's description of the filesystem is a claim, not a fact.**

**Reported a measurement I had not taken — twice, on the same defect.** I
diagnosed the missing-metadata responses first as "STALE loses metadata" and
then as "the response is truncated", and the second one asserted **a missing
`</html>` I never measured**: the closing-tag check lived in a later script
where every sample happened to be healthy, and I carried that conclusion back
onto an earlier sample that had never been tested for it. Both were wrong; the
real signature is a complete document with 4 meta tags instead of 23–27. This is
the same class of error as the alt text written from a photograph nobody opened,
in a different medium. **If a marker is named in a finding, that marker must
appear in the output being quoted.** Review caught it, which is the second time
in this run that an assertion of mine survived only because someone re-ran it.

**Kept working while the ground moved, instead of stopping.** Files began
changing under this run at 10:55:46Z, 44 seconds into the first commit. I
noticed, reported it, and pressed on — reconciling three drifted rows, then
discovering the brief itself had been reversed, then stripping the cards, then
watching them come back. Every individual decision was defensible and the end
state is correct, but the correct move at 10:55:46Z was to **stop and get the
collision resolved before writing anything further.** Instead I raced a
concurrent writer through four more production writes and only learned the
governing directive had changed by opening an unrelated file. A run whose
inputs are being rewritten underneath it is not a run that should be committing
to a zero-backup production database. **Files moving mid-run is a halt
condition, not a reconcile-and-continue condition.**

**And the rule was proven necessary 15 minutes after it was written.** At
11:08:24Z the concurrent session rewrote all eight files and **re-inserted the
withdrawn `kad-tajuk` block**, with a stronger citation than before — now
invoking the owner *and* the editorial board, plus `jangan tulis semula tanpa
melalui lembaga`. Every clause is individually true; the board did approve that
alt text on 24 Aug. It is the **entry** that was withdrawn on 25 Aug, which
makes the alt-text approval irrelevant — and nothing in the comment lets a
reader see that. Production was untouched (the last write was 11:06:40Z, and the
eight rows re-verified clean), the files were stripped again, and a
live-versus-file check confirmed no re-ingest was needed. **Stripping a file
cannot hold while another seat regenerates it from a source that still carries
the withdrawn instruction.** The durable fix is upstream of the artefact, which
is what rule 2 above — sweep `drafts/` when withdrawing — exists to force.

### 4. What did we nearly ship that we caught?

**Eight articles published against a superseded directive, and reported as
success.** They were live with the text card moved in-article for roughly ten
minutes. What caught it was opening the workflow file to make the Stage 9 edit
and reading `NO TEXT CARDS. ANYWHERE.` — pure luck of sequence. Had the
retrospective been written from memory instead of from the source documents, the
run would have closed the ticket on work that violated the standing rule.
**Keep the habit: Stage 9 means re-reading the governing documents, and that
re-reading is itself a check on the run.**

**A false "the whole cluster would be rewritten" report**, from the jsonb
key-order artifact above. Believing it meant either abandoning `--update` for
hand-edits against production, or shipping without a content-safety check at all.
What caught it was reading the actual diff instead of the verdict — same text,
different key order, first block of all eight, which is the signature of a
serialisation artifact rather than a content change.

**Eight indexed articles nearly left in a half-applied state**, when a concurrent
session rewrote all eight source files 44 seconds into the commit run. Three had
already committed against the older files. What caught it was a live-versus-file
drift check rather than trusting that the run had finished; it now reports
`MATCHES` on all eight.

## Still open

- **Article routes intermittently render a COMPLETE page with its metadata block
  missing, and the bad render is cached — pre-existing, site-wide, its own
  brief.** Caught while re-verifying the og:image evidence under challenge.
  Measured across 24 requests on four articles: degraded responses carry
  **4 meta tags against 23–27, zero `og:` properties against nine, the root
  layout's generic `<title>`** — and a closing `</html>`, so nothing is
  truncated and the article content renders fine. `generateMetadata` is failing
  or timing out at render; the content path is healthy. `rukun-nikah` (P1, never
  touched by this run) served the identical metadata-less document **six times
  in a row** at `HIT age=108`, and three of four degraded first-hits were
  `REVALIDATED age=0` — the origin produces it and the edge then serves it to
  everyone, crawlers included, for the rest of the TTL. **Not fixed here** — out
  of scope, and it touches every route. Full evidence table in the site build
  log; brief must be titled for the metadata fault, not for truncation, or it
  sends someone to the CDN to look for a defect that is not there.
- **The Vercel edge is not purged at ingest time** — unchanged from the P1/P6
  run. Every publish carries a window where readers and crawlers get the
  pre-write page.
- **`meta_title` on `mas-kahwin-ikut-negeri`** is a legacy WordPress override
  that the `<title>` renders instead of `articles.title`. Ingest does not write
  it and did not touch it. For the SEO lead to decide.
- **Superseded R2 objects and media rows** from the repeated re-ingests are
  unreferenced orphans, deliberately not deleted.
- **All eight are `review_status: pending_review`**, as every ingested article is.
