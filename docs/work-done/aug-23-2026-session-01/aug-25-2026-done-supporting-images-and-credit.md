# Supporting images, the graphic kit specs, and the credit chain — 25 Ogos 2026

**Session:** aug-23-2026-session-01 · **Owner:** managing-editor · **Status:** completed
**Plan:** [Brief — supporting images and the credit chain](../../plans/aug-23-2026-session-01/aug-25-2026-brief-supporting-images-and-credit.md)

## What was done

Four tasks, all delivered. **Nothing was sent to anyone, nothing was deployed,
and no production write was made.**

**Task 1 — the templates and the map.** Finished the specs for the five
remaining kit templates plus the checklist card, and mapped every article in the
pipeline to the graphics it should carry, with the Malay alt text for each.
Reopened the A1 in-article card decision and generalised it across the live
eight.

**Task 2 — the credit chain for images that are not ours.** Audited the 682
inherited WordPress items and the 29 legacy articles against the real export,
loaded the findings into the register, produced a ranked rights-risk list, and
built the consolidated request list against the two licence templates.

**Task 3 — enforceability.** Read every code path by which an image can reach a
live page and reported what it would take to enforce the credit rule on all of
them, and whether it is worth doing.

## Evidence

### Files created

| File | What |
|---|---|
| [`plans/…/aug-25-2026-spec-graphic-kit-remaining-templates.md`](../../plans/aug-23-2026-session-01/aug-25-2026-spec-graphic-kit-remaining-templates.md) | Six template specs: `jadual-perbandingan`, `urutan-langkah`, `grid-kategori`, `carta-jalur-kos`, `rajah-nisbah`, `kad-senarai-semak` |
| [`plans/…/aug-25-2026-map-article-to-graphic.md`](../../plans/aug-23-2026-session-01/aug-25-2026-map-article-to-graphic.md) | 45 graphics mapped across 28 articles, with the template, the data and the Malay alt text for each. The credit-string ruling. Task 1.3 ranking |
| [`plans/…/aug-25-2026-rights-risk-and-request-list.md`](../../plans/aug-23-2026-session-01/aug-25-2026-rights-risk-and-request-list.md) | Ranked rights-risk list, and the ready-to-send request list against both licence templates |
| [`plans/…/aug-25-2026-enforcing-credit-everywhere.md`](../../plans/aug-23-2026-session-01/aug-25-2026-enforcing-credit-everywhere.md) | Task 3, grounded line by line in the shipping code |

### Files modified

| File | What changed |
|---|---|
| `docs/asset-register/asset-register.csv` | 682 `HK-L` rows: `digunakan_dalam` rebuilt from real embedding, 67 rows corrected. 4 rows gained a caption-asserted creator. 8 `HK-C` cover rows moved from `belum-dihasilkan` to `boleh-guna` with their real filenames. 8 new `HK-C-0009`–`HK-C-0016` rows for the P1/P6 covers |
| `docs/asset-register/README.md` | New §6.1 recording every correction and its method. `kapsyen-wordpress` added as an evidence class. The class G font-licence question settled with evidence |

### The numbers, and how they were derived

Every figure comes from a direct parse of
`data/hellokahwin-export/content/media.json` and `posts.json`, resolving
`featured_media` ids and every `/wp-content/uploads/` URL in every post body with
WordPress size suffixes normalised back to originals. **Zero unresolved
references** — every image URL in every post maps to a media item.

| | |
|---|---|
| Media items | 682, all present on disk |
| Embedded in a published post | **618** |
| Orphaned (on no article) | **64** |
| Real Wedding sets / studios | 15 sets, **10 studios**, 401 files, 14 live articles |
| Files with an EXIF-asserted creator | 120 (106 `copyright`, 96 `credit`, 82 both) |
| `licensor_name` established | **0** |

Template capacity was measured with the generator's own `measureText` against
real Malay strings on the render host, not estimated. `Tiada kadar minimum
ditetapkan` is **1,292px** at the 88px floor; `Jabatan Agama Islam Selangor
(JAIS)` is **1,438px**.

### Humanizer

All nineteen new Malay alt strings and the one new letter sentence passed
`/humanizer` after they were written; fourteen of twenty were changed. The
board-approved alt text for `HK-G-0001` to `HK-G-0010` was left untouched,
including two strings that end without a full stop, and so was the writers' own
alt text on the 21 graphics they declared.

## What it changed

**Four premises in the brief were wrong and correcting them changed the work.**

1. **The rule is not "enforced only at ingest, for `cover`".** The parser
   enforces `credit`, `licenseClass` and `licensorName` on `cover` **and** on
   every entry in `images[]`, and closes four separate body-smuggling routes,
   with a test file covering all of it. **The real hole is the admin console**,
   which has no enforcement at any of six layers — no field, no validation, no
   insert value, no read-back, no constraint, no test — and a renderer that shows
   nothing at all when a credit is NULL. The 682 are not a closed historical
   problem; the identical defect is reproducible today with a drag-and-drop.
2. **There were no twelve articles when I started, and there are now.** Both
   briefs had been dispatched hours earlier and delegated topic selection to the
   writers. All twelve landed mid-task, and they declared 21 in-article graphics
   with their own Malay alt text — so the map became a per-graphic template
   assignment rather than the cluster-level fallback I had planned.
3. **Both photography gap lists landed too**, verified business-by-business
   against pages loaded 25 Ogos 2026. The forward-looking request list is built
   on them and prioritised 1 to 12.
4. **A1's in-article card cannot be 1200 × 1500.** Fourteen rows do not fit a 4:5
   card at the legibility floor at any canvas size — the ratio binds, not the
   pixels. Measured, it is 2464 × 3480 with three columns.

**The Task 1.3 answer is six cards, not ten** — two built for the image pack
(A1's state table, A6's Pahang timeline), four built for the reader. A3's card is
built knowing it will lose the pack to competitors' bare `RM22.50` cards,
because our honest card says the figure is unconfirmed and that is the correct
outcome.

**The Task 2 answer is that exposure is low and we should not spend on it.** Two
images come down today (a Getty/iStock file and a press photograph, both
institutional rights holders). The 401 Real Wedding photographs get ten emails,
sent because those ten studios are the ten people we most want a relationship
with next quarter, not out of fear. The 269 vendor images stay and are left
alone. No clearance budget, no rights coordinator, no lawyer.

**The Task 3 answer is yes for four to five days of work and no for the 682.**
Retroactive enforcement on the legacy library cannot be done honestly — every
method either fabricates a provenance or destroys the distinction between an
honest gap and an unasked question, and it competes with the Tier 1 work that
stops the set growing. Some of the pages carrying those images are in the rewrite
queue, but the plan books seven upgrades in P2 rather than all 29, so that
reduces the work rather than removing it.

## What changed after the first pass, and why it is recorded rather than rewritten

This work ran while four writers and a sourcing run were working on the same
repo. Three of my findings were overtaken within hours, and the corrections are
left visible in the documents rather than edited out.

| I reported | What was true by end of day |
|---|---|
| "There are no twelve articles" | **All twelve landed.** They also declared 21 in-article graphics with their own Malay alt text, so the map became a per-graphic template assignment instead of the cluster-level fallback I had planned |
| "Neither photography gap list exists, and only one writer was asked" | **Both landed**, both verified business-by-business against pages loaded 25 Ogos 2026. The forward-looking request list is built on them |
| "The forward-looking half cannot be consolidated" | It is consolidated, prioritised 1 to 12, with three candidates held pending verification |

**Two errors of my own, corrected.** I gave the register agent `bukti_lesen`
paths that do not resolve from this repo — the generator lives in
`hellokahwin-site` — now repo-qualified on all 16 rows with the done-log path
added. And my own `kapsyen-wordpress` change falsified README §6's "120 / 562"
figures, which are now 123 / 559.

## Chair's ruling made during the work

**The credit string had split into two conventions and I closed it.** Eight
published C2.4 covers carried `Grafik: HelloKahwin`; every unpublished draft in
the pipeline carried a bare `HelloKahwin` — **35 occurrences across 20 files**.
Style guide §13.1 sets `Grafik:` for our own graphics, it is already live on
eight pages, and a bare name under an image reads as a byline rather than a
source. Applied to all 35 drafts and to the 8 register rows. Every one was
unpublished, so it was free now and expensive later.

`CREDIT_BRIEF` still exists in the generator and can reintroduce the split.
**Delete the constant.**

## Follow-ups

**For the CEO, in priority order:**

1. **A2's live page still carries its internal `## SOURCE NOTES` appendix** —
   about fifty lines of English editorial notes, raw gazette URLs and a
   strikethrough retracted-claims table, after the Malay reader content. The
   publish brief said to drop it. Not an image problem, and it outranks
   everything else in this log.
2. **Run the attachment-page check.** One minute, no contact required, and it
   moves 64 images in or out of the exposure picture.
3. **Remove the Getty/iStock image and the press photograph.** Two deletes.
4. **Decide on the ten template B letters**, and on template A to Inai Republic.
   The second is a reader-safety argument, not a traffic one.
5. **Tier 1 of the enforcement work — close the admin door.** Two to three days,
   and it is the only work that stops the uncredited set growing.
6. **Delete `CREDIT_BRIEF`** from the generator so the credit split cannot
   return.

**Owned by me, next:**

- The P1/P6 review board, which has not sat. None of those eight publishes before
  it does.
- The twelve P3/P5/P4/P7 drafts have not been through a board at all.
- The 45 mapped graphics go through a board as new published content once the
  templates exist.
- **Fold the CC-licence credit form into style guide §13.1.** The sourcing run
  wrote `Kredit: Azlan DuPree (CC BY 2.0)` and declared it as the smallest honest
  extension of §13.1, since a CC licence requires the licence itself to be named.
  It is right and I am ratifying it, but it is not yet in the style guide.
- **`bunga-telur-anatomi` comes out of that article's front matter** until an
  illustration commission exists. A declared image with no path to existing
  blocks ingest.

**Open and unresolved:**

- **Three articles want something this kit cannot make** and they are one gap,
  not three: an anatomy illustration for `bunga-telur`, the inai colour
  side-by-side, and Arabic doa typesetting. An illustration commission, a
  photography commission and a font decision. Do not stretch the kit.
- **Renders are host-dependent.** librsvg resolves fonts from the render box, so
  kit spec §10.4's byte-identical requirement is not met and cannot be on this
  pipeline. Fixing it means `satori` + `resvg-js`.
- **`Disemak Ogos 2026` is baked into every render.** On 1 Januari 2027 every card
  misstates its own currency.
- **`wp-import.ts` still runs live by default** and writes uncredited media rows.
  Fifteen minutes to flip.
- **The asset register has concurrent writers and no lock.** Five rows changed
  under an agent mid-run this session. Nothing was lost because the script
  re-read before writing, but that was luck rather than design.
- **The register's sort rule contradicts itself.** README §7.4 says "sorted by
  `asset_id`"; the file is grouped by class in insertion order and always has
  been. Two people have now flagged it. Pick one and say which.
- **`perihal_ms` may be wrong beyond the five rows I fixed.** Five caption rows
  held the raw caption instead of a description of the image. Whatever generated
  the register did that; the rest of the column has not been audited.
