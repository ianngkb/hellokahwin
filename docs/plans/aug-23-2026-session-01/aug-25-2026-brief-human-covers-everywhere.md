# Brief — Managing Editor — Every cover becomes a human photograph. Replace all of them.

**Status:** APPROVED — executing. **Owner directive, 25 Aug 2026:**
*"Please ensure ALL articles are using cover images that are human, not text.
Update all that was generated."*

**Dispatch with `-PermissionMode bypassPermissions`.**

---

## The decision, and what it reverses

Every cover we have made is a **typographic data card** — `kad-tajuk`. They are
well built, honest, and they are not what the owner wants. **Covers must be
photographs of people.**

This reverses my own scope cut. I chose text cards because they were fast,
rights-free and provably honest. The owner's judgement is that a wedding site
whose article cards are all typography looks like a spreadsheet, and they are
right — a reader scanning a category page sees a wall of purple text blocks, not
a wedding.

**The data cards are not wasted.** They keep their value *inside* articles, where
a state-comparison table earns its place and where the Managing Editor's own
evidence says image packs sit at position 1 on `mas kahwin johor`. **Move them
in-article; replace every cover with a photograph.**

## Scope — all 28 articles

| Where | Count | Current cover |
|---|---|---|
| **Live**, `/artikel/hantaran-mas-kahwin/` | 8 | `kad-tajuk` text card |
| **Cleared by the board**, P1 + P6 | 8 | `kad-tajuk` text card |
| **Written**, P3, P4, P5, P7 | 12 | none yet |

Every one needs a human photograph as its cover.

## The standard — this is the whole job

**Every cover is a licensed, credited photograph of real people.** Same chain as
`apa-itu-mas-kahwin`, which is live and correct: a named photographer, a licence
permitting commercial use, a source URL, `licenseClass: S`, and a credit line
that renders on the page.

Sources, in order: **Wikimedia Commons** (best for Malay cultural subject
matter), then Unsplash, Pexels, Pixabay, Openverse. **CC BY-NC and CC BY-ND both
fail us** — non-commercial is disqualifying and no-derivatives breaks the crop
pipeline. Verify the licence at origin, never from an aggregator's label.

Never: Google Images, Pinterest, another wedding blog, a vendor's site without
written permission.

## What "human" means here, and the trap to avoid

**Malaysian Malay people at a Malaysian Malay wedding.** Baju melayu, songkok,
tudung, songket, pelamin, dulang hantaran, akad nikah, bersanding.

**The failure mode is a Western stock wedding** — a white dress in a church, a
smiling couple against a white studio background. That would make us look like a
translation of somebody else's site, which is the single worst outcome for a
Malay-first brand. **An article keeping its text card is better than an article
with a culturally wrong photograph.** If you cannot find a right image for an
article, say so and leave that one; report it as a gap.

**You will not find 28 distinct good images.** Reusing one photograph across two
or three closely-related articles is acceptable and normal — the eight mas kahwin
state articles do not each need a unique face. Say plainly where you reused.

## What to do

1. **Source the photographs.** Thirteen are already downloaded in
   `docs/plans/aug-23-2026-session-01/drafts/images/` and licence-verified in the
   register; reuse them where they fit and source the rest.
2. **Swap `cover` in every draft's front matter** to the photograph, with real
   Malay alt text, `credit`, `creditUrl`, `licensorName`, `licenseClass: S`.
3. **Move the displaced `kad-tajuk` card into the article's `images:` block** —
   it is still the best asset we have for the data, and it is `licenseClass: G`,
   `credit: HelloKahwin`. Do not delete these; they were expensive and they are
   good.
4. **Update the asset register** for every image, both directions.

## Two things already known that will bite you

- **A path-convention mismatch** the review board flagged: P1 covers use
  `cover-borang-nikah.png` while P6 uses `./C6-2-A1-…-cover.png` with a leading
  `./`. One is probably wrong for the parser. **Settle it and use one convention
  everywhere.**
- **The eight live articles must be updated in place** — `--update`, same slugs,
  same URLs. They are indexed. Do not create new articles and do not change a URL.

## Publishing

**Do not publish in this brief.** There is an open defect in
`scripts/ingest-article.mts` — `articles.content` is double-encoded on every row
we have ingested — and it is being fixed first so the next twenty articles are
not written wrong. Covers and front matter only; ingest follows.

## Rules

- Never fabricate a photographer, a licence or a URL. Unsure means no.
- No outbound contact with any photographer — that list is with the owner.
- `/humanizer` on any audience-facing text you write.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report: every article with its
new cover, photographer, licence and source URL; where you reused an image and
why; **every article you could not find a decent human photograph for**; the
path-convention decision; and confirmation the data cards were preserved
in-article rather than deleted.

---

## ADDENDUM — 25 Aug, priority order (CEO)

A previous run of this brief died on a usage limit. Resuming on a fresh account.

**Do P1 and P6 FIRST — those eight articles.** They are verified, board-cleared
(four blocks, all closed in-file) and they are the only thing standing between
us and two more pillars going live. The moment their covers exist they publish.

Order: **P1 + P6 (8) → the 8 live C2.4 → P3/P4/P5/P7 (12).**

Report after each group rather than holding everything to the end. If you finish
P1/P6 and nothing else, that is a good outcome and I want it reported immediately.
