# Brief — BMAD — Eight more covers, P1 and P6. Extend the generator, do not rebuild it.

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.

---

## Context

Last night the eight C2.4 articles published. **P2 is the only pillar out of
`noindex`** — the sitemap went 39 → 47 and `/artikel/hantaran-mas-kahwin` is
indexable. Six pillars are still empty, and that is the whole problem.

Two writers delivered overnight. **Eight articles, already ingest-ready**, in
`docs/plans/aug-23-2026-session-01/drafts/` in the docs repo:

| Pillar | Cluster | File |
|---|---|---|
| P1 | C1.1 | `borang-nikah.md` |
| P1 | C1.2 | `rukun-nikah.md` |
| P1 | C1.2 | `syarat-sah-nikah.md` |
| P1 | C1.2 | `lafaz-taklik.md` |
| P6 | C6.2 | `C6-2-A1-harga-sewa-dewan-kahwin.md` |
| P6 | C6.2 | `C6-2-A2-checklist-kahwin.md` |
| P6 | C6.2 | `C6-2-A3-pakej-dewan-kahwin.md` |
| P6 | C6.2 | `C6-2-A4-bajet-kahwin.md` |

Each already names the cover file it wants in its front matter. **None of those
files exist.** That is the only thing this brief fixes.

## The job

**Extend `scripts/generate-cover-graphics.mts`. Do not build a second
generator.**

It already works — I ran it myself last night and it rendered eight covers in
seconds from the brand tokens in `globals.css`, with a contact sheet. The
architecture is right: specs in `scripts/covers/c2-4-cover-specs.mts`, template
in `covers/`, tokens read from source rather than hardcoded.

Add spec files for these eight, in the same shape. Add a `--set` or equivalent
flag so a caller picks which set to render rather than the script hardcoding
C2.4. Keep the existing C2.4 specs working — the eight live articles must stay
regenerable.

## What each cover must carry

**Read each article and take its content from the article.** Do not source
figures independently and do not carry a number between articles.

- **P1 (nikah procedure)** — these are procedural, not numeric. A title card with
  the entity phrase and the one or two facts that matter: which form, which
  authority, what the fee is *and its date*. The C1 writer flagged that Penang's
  kursus fee rises RM100 → RM120 on 1 September; if that appears on a card, the
  card must say which figure applies from when, or omit it.
- **P6 (cost)** — a cost band is the natural shape. `harga-sewa-dewan-kahwin`
  carries real council rates (RM60/hour to RM3,600/session, MBPJ, Klang, MBSJ,
  Sepang). Show the range and name the source authority on the card.

**Honesty rules, carried over from C2.4 and non-negotiable:**

- A figure we could not confirm gets an asterisk and a plain-Malay note, exactly
  as the C2.4 cards do — *"Belum disahkan sebagai kadar semasa."*
- Where an authority publishes **no** figure, say so on the card. "Tiada kadar
  ditetapkan" is a real answer and it is what beat the incumbents on C2.4.
- Every card is our own work: `credit: HelloKahwin`, `licenseClass: G`,
  `licensorName: HelloKahwin`.
- **Do not bake a review date into the artwork** unless the same date is in the
  article. "Disemak Ogos 2026" is baked into the eight C2.4 PNGs and has to be
  regenerated in January; do not add to that debt silently — if you bake a date,
  list which files carry it in your report.

## Geometry — the lesson from last night

The C2.4 cards ended up **portrait, 2464×3080**, not the 2464×700 the spec first
assumed, because a data-bearing card does not survive being cropped blind.
Follow the same approach and **show me all four crops** — `crop-16x9-og`,
`crop-4x3-article-card`, `crop-4x5-mobile-cover`, `crop-4.3x1-desktop-hero` — on
the contact sheet.

If a crop clips a figure, a form number or the title, say which crop broke what.
Do not fix it quietly.

## Alt text

Write real Malay alt text per cover, describing what the card shows. Not a
filename, not one sentence repeated eight times. It goes to the Editorial Review
Board with the articles.

## Not in this brief

- **Do not ingest and do not publish.** These eight are in editorial review in
  parallel with your run. Publishing is a separate act after the board clears
  them.
- Do not touch the eight live C2.4 articles.

## Rules

- `pnpm --silent`, never `pnpm run`, for anything with a secret in argv.
- No production writes at all in this brief.

## When done

Render into the drafts directory so each cover sits beside its article and the
front-matter path resolves. Log to `docs/work-done/` and report: the flag you
added, the eight covers with their alt text, every crop verdict, any figure you
had to asterisk, and any file carrying a baked review date.
