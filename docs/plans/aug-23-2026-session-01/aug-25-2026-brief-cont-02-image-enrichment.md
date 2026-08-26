# Brief — Managing Editor — CONT-02: supporting images to target across the live articles

**Status:** APPROVED — executing. Sprint 01, item CONT-02, 3 points.
**Dispatch with `-PermissionMode bypassPermissions`.**

## Source and stage now. The ingest is gated on RISK-01.

Find the images, write the alt text and captions, update the drafts and the asset
register. **Do not ingest.** RISK-01 (a production recovery point) is open and
nothing writes to production until it closes.

**File-conflict warning, and it is real.** SEO-02 (the internal-linking pass)
edits the same article files you will. I am holding SEO-02 until you are done
rather than running both — on 25 Aug two agents rewrote the same eight files
mid-run and, because ingest is whole-file, the loser's work would have published
anyway. **If you see article files changing under you, stop and tell me.**

---

## The gap, measured

Images per article, counted across the drafts:

| Pillar | Articles | Images | Average |
|---|---|---|---|
| P4 Busana | 3 | 11 | 3.7 |
| P5 Pelamin/Kad | 3 | 11 | 3.7 |
| P1 Nikah | 4 | 9 | 2.2 |
| P6 Venue/Kos | 4 | 9 | 2.2 |
| P7 Sebelum Nikah | 3 | 6 | 2.0 |
| **P3 Ucapan/Doa** | 3 | 4 | **1.3** |

P4 and P5 are the standard. **P3, P7, P1 and P6 are the work.**

## Definition of done — verbatim from the sprint file

> A per-article table of image count before and after, produced by a command
> over the drafts or database. Every live article at roughly one image per major
> H2 or carrying a written reason it is thin. Zero images missing credit,
> licensorName or licenseClass. Zero `kad-tajuk` paths anywhere.

**Produced by a command.** Not counted by hand — my own hand-count of this was
wrong twice today because the front matter uses `- file:` for list entries and my
pattern missed the dash.

## The two rules that beat the count

1. **An image that illustrates nothing is padding** and makes the article worse
   and slower. A photograph of a wedding does not illustrate a section about a
   form number.
2. **A culturally wrong image is worse than no image** — a Western church
   wedding, a white-studio stock couple. This does not bend for coverage. If an
   article can honestly carry two, it carries two and you tell me which and why.

**No text cards anywhere**, cover or in-article. Owner directive, 25 Aug. The
`kad-tajuk` PNGs stay on disk unreferenced — do not delete the files, do not put
them on a page.

## Sourcing

Thirty-three photographs are already downloaded in
`docs/plans/aug-23-2026-session-01/drafts/images/` and recorded in the register.
Reuse where they fit; source the rest. Wikimedia Commons first for Malay
cultural subject matter, then Unsplash, Pexels, Pixabay, Openverse. **CC BY-NC
and CC BY-ND both fail us** — non-commercial disqualifies, no-derivatives breaks
the crop pipeline. Verify at origin, never from an aggregator's label.

Reuse across closely-related articles is expected, not a compromise. Say where.

**Report every subject for which no usable licensed image exists.** That gap list
is the evidence for whether we commission photography, and it is a deliverable.

## Rules

- One path spelling: `images/S-name.jpg`, no `./` prefix.
- Every image: real Malay alt text for someone who cannot see it, a caption that
  teaches rather than describes, `credit` + `creditUrl` + `licensorName` +
  `licenseClass`, register entry both directions.
- Never fabricate a photographer, a licence or a URL.
- No production database writes in this brief.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** —
Stage 9, mandatory. Name the file that must change, and edit it. Report the
before/after table and that the drafts are ready to ingest.
