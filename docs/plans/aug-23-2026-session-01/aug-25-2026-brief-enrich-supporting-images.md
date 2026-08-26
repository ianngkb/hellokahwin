# Brief — Managing Editor — Enrich every article with as many supporting images as it can honestly carry

**Status:** APPROVED — executing. **Owner directive, 25 Aug 2026:**
*"Can we ensure there is as much supporting images on all the articles as much
as possible."*

**Dispatch with `-PermissionMode bypassPermissions`.**

---

## Where we are

Image counts across the 20 drafts, measured just now:

| Pillar | Images per article | Verdict |
|---|---|---|
| **P4** Busana | 3, 4, 4 | good — this is the target |
| **P5** Pelamin/Kad | 3, 3, 5 | good |
| **P7** Sebelum Nikah | 2, 2, 2 | thin |
| **P3** Ucapan/Doa | 1, 1, 2 | thin |
| **P1** Nikah procedure | 1, 1, 1, 2 | thin |
| **P6** Venue/Kos | 1, 1, 1, 2 | thin |
| **C2.4** (8 live) | 0–1 | thinnest, and public |

33 licensed photographs are already downloaded in
`docs/plans/aug-23-2026-session-01/drafts/images/`, all recorded in the register.

**The visual clusters got rich treatment; the procedural and cost clusters got
one image and a text card.** That gap is the job.

## The target

**Aim for an image roughly every major H2 section** — so a long procedural
article carries four or five, not one. P4 and P5 already do this and they are
the standard to match.

**But this is a ceiling, not a quota.** Two rules override it:

1. **Every image must earn its place.** An image that illustrates nothing is
   padding, and padding makes an article worse and slower. If a section is about
   a form number, a photograph of a wedding does not illustrate it — a
   *contextual* image of a couple at a registration counter might, and if neither
   exists, that section has no image.
2. **Never use a culturally wrong image to hit a number.** Malaysian Malay
   people, Malay wedding context. A Western church wedding or a white-studio
   stock couple is worse than a section with no image at all. This rule does not
   bend for coverage.

If an article can only honestly carry two, it carries two, and you tell me which
and why.

## What counts as a supporting image

Three kinds, and use all three:

1. **Licensed photographs** — `licenseClass: S`, full credit chain. Wikimedia
   Commons first for Malay cultural subject matter, then Unsplash, Pexels,
   Pixabay, Openverse. **CC BY-NC and CC BY-ND both fail us.** Verify at origin.
2. **Our own data graphics** — `licenseClass: G`, `credit: HelloKahwin`. The
   `kad-tajuk` cards being displaced from covers belong here, and the generator
   (`pnpm --silent covers --set …`) can produce more. **A cost band chart, a
   state comparison table or a step sequence is often a BETTER illustration than
   a photograph for procedural and cost articles** — and it is rights-free.
   Your own evidence says image packs sit at position 1 on `mas kahwin johor`
   occupied by typographic data cards, so these are not a consolation prize.
3. **Authority screenshots or official document images** — only where the source
   permits reuse. Check the terms; do not assume a government page is free.

**P1 and P6 will lean on kind 2.** That is the right answer for them, not a
compromise.

## Scope, in priority order

1. **P1 + P6 (8 articles)** — they are verified, board-cleared and publishing
   next. Do these first.
2. **The 8 live C2.4 articles** — public now, thinnest of all. Update in place,
   `--update`, same slugs, same URLs. Never change a URL.
3. **P3 + P7 (6 articles)** — thin at 1–2 each.
4. **P4 + P5 (6 articles)** — already good; top up only where an obvious gap
   exists.

## For every image, without exception

- Real **Malay alt text** describing what is in the frame, written for someone
  who cannot see it. Not a filename. Not the same sentence reused.
- A **caption that teaches** rather than describes. The best one on the site so
  far: *"Sighah, iaitu ijab dan qabul, ialah rukun kelima. Selepas lafaz itu
  selesai, akad sudah menjadi."* That is the bar.
- **`credit`, `creditUrl`, `licensorName`, `licenseClass`** — all four, always.
- **Recorded in the asset register**, both directions.

Reusing one photograph across two or three closely-related articles is fine and
normal. Say where you reused.

## Rules

- Never fabricate a photographer, a licence or a URL. Unsure means no.
- No outbound contact with any photographer.
- Do not publish. Front matter and files only; ingest is separate.
- Note the file-size finding: sourced originals up to 15 MB are fine — the R2
  derivative pipeline serves a 66 KB `high.webp`. Do not pre-compress.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report: the new image count per
article; every image with photographer, licence and source URL; **every article
you deliberately left thin, and why**; and any subject for which no usable
licensed image exists — that gap list is what tells me whether to commission
photography.
