# Brief — Sprint 02 — CONT-09: covers must depict their subject

**Status:** APPROVED — executing. Sprint 02 is in progress.
**Repo:** the DOCS repo — `C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin`
**Dispatch mode:** `bypassPermissions` (you must read the site worktree and query production).

## THIS RUNS BEFORE THE WRITERS, AND THAT IS THE POINT

Four content items (CONT-05 to CONT-08) will produce **25 articles** this sprint.
They will each need a cover. **The standard you write here is the one they follow.**
If this lands after they write, we get 25 more covers that do not depict their
subject, and re-selecting them becomes a second job.

Treat the standard as the deliverable and the re-selection as the proof it works.

## Why (verbatim from the tracker)

Owner directive 26 Aug. The UX review found the same thing independently and called it systemic: dulang-hantaran is about gift TRAYS and its cover is a tight crop of two guests' torsos with no tray in frame. TWO SEPARABLE CAUSES. (1) No selection standard exists — nothing anywhere says a cover must depict the article's subject, so nobody was wrong to pick a generic wedding image. (2) The pool is wrong — the register holds 152 stock, ZERO class-V photographer licences, and 658 of 794 rows with licensor 'TIDAK DIKETAHUI'. CC-licensed Malay wedding imagery is amateur snapshots, so no selection rule can produce a premium cover from it. This item fixes (1) and re-selects within what we can lawfully use. (2) is the owner's manual photographer outreach, arriving separately as class-V grants — see docs/plans/aug-23-2026-session-01/aug-26-2026-plan-photographer-outreach-list.md.

## Definition of done (verbatim — the bar, and it is not narrowed)

A written cover-selection standard in the content production workflow AND both writer personas — the file the next person reads, not a brief. It must state: the cover DEPICTS THE ARTICLE'S SUBJECT; what to do when no such image is licensable (say so and escalate, never substitute a generic wedding photo); and that crop is chosen so the subject survives both the 4x3 card and the desktop hero. Then re-select covers for every live article failing the standard — AUDIT ALL 61 AND REPORT THE COUNT BEFORE CHANGING ANYTHING, because the CEO has twice reported an image finding that measurement disproved. Every replacement keeps a full credit chain and register entry. Zero text cards. Report honestly how many articles CANNOT be fixed from the current licensable pool — that number is the size of the case for photographer outreach, and is more useful than a partial fix presented as done.

---

## Read this before you start, because the CEO got this wrong twice

The CEO reported two image findings this week that measurement disproved:

1. **"The `dulang-hantaran` homepage card is a broken image variant."** It is
   not. Every homepage image resolves at `naturalWidth: 1600`. Cards 3–12 are
   `loading="lazy"` over a `bg-muted` plate with no blur placeholder, so until
   the WebP decodes the card *is* a grey box. The CEO watched an image decode and
   named a bug. (That is UX-04's job, not yours — do not fix it here.)
2. **"There is no search anywhere on the site."** There is. It works. It is
   simply not linked from the masthead.

**So: audit before you assert, and report the count before you change anything.**
The DoD requires this explicitly. If your audit disagrees with the CEO's framing,
the audit wins and you say so.

## What is actually true about the image pool

- The register holds **152 stock, 54 our-own-graphic, 28 couple-submission, and
  ZERO class-V photographer licences.** 658 of 794 rows carry
  `licensor_name: TIDAK DIKETAHUI`.
- Current covers are CC-licensed Flickr/Wikimedia images. There is no premium
  option inside that pool, so **do not attempt to solve "premium" here.**
- The owner is running photographer outreach manually to open a class-V pool.
  See `aug-26-2026-plan-photographer-outreach-list.md` in this folder.

**Your job is RELEVANCE, which is fixable now. Premium is a pool problem and is
not yours.** The most useful number you can produce is how many articles cannot
be fixed from the current licensable pool — that figure is the size of the case
for outreach, and it is worth more than a partial fix reported as complete.

## Standing rules that bind this work

- **Zero text cards.** Owner directive, absolute, cover or in-article. There were
  28 live in August and the CEO swept them to zero; do not reintroduce one.
- **Every image carries `credit`, `creditUrl`, `licensorName`, `licenseClass`**
  and an asset-register entry. An uncredited image is worse than a missing one.
- One path spelling: `images/S-name.jpg`, no `./` prefix.
- **Record a precise undo before any production write**, and COMMIT it.
- `--revalidate-url` is mandatory on ingest. `pnpm --silent`, never `pnpm run`.
- **Done means SHIPPED** — in the production database and visible to a reader,
  not in a draft file. CONT-02 was marked done in August with 69 images sitting
  in draft front matter that no reader ever saw.

## Where the standard must land

Not in a brief. In the files the next person actually reads:

- `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`
  — Stage 6b is the visual build; the standard belongs there.
- **Both writer personas**, via the skillcentral copies at
  `C:/Users/Ian Ng/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Editorial/`
  — `writer-adat-agama-prosedur.md` and `writer-inspirasi-vendor-venue.md`.
  Edit the skillcentral originals, not the deployed copies; the CEO runs
  `install.sh` to re-wire.

A rule that lives only in a brief gets re-asked every batch. That is exactly why
the IMEJ-marker rule was promoted to a format error in August.

## Report format

**CLAIM + EVIDENCE + LIVE LINK.** Quote the audit table from a command, not by
eye. For any cover you replace, quote the credit line from live HTML.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
Four questions: what did we learn that is not written down; **which document must
change and who owns the edit (name the file)**; what did we do twice that we
should never repeat; what did we nearly ship and what caught it. **Then make the
edit.**
