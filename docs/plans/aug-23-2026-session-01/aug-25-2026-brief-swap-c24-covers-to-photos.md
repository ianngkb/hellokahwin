# Brief — BMAD — Swap the eight LIVE C2.4 covers from text cards to photographs

**Status:** APPROVED — executing. Owner directive, 25 Aug 2026: covers are human
photographs, not text. **Dispatch with `-PermissionMode bypassPermissions`** in
the site worktree. **Production database CRUD is granted.** Do not stop to ask.

---

## The gap, measured

I checked every live article's `og:image` just now:

| Pillar | Articles | Cover |
|---|---|---|
| P1 `nikah-undang-undang` | 4 | **PHOTO** ✅ |
| P6 `venue-perancangan` | 4 | **PHOTO** ✅ |
| **P2 `hantaran-mas-kahwin`** | **8** | **TEXT CARD** ❌ |

The eight C2.4 articles published *before* the human-cover directive, so they
still carry `kad-tajuk` typographic cards. P1 and P6 published after and got
photographs. **This brief closes the gap.**

## The complication

The C2.4 drafts at `docs/plans/aug-23-2026-session-01/drafts/A1..A8-*-REVIEWED.md`
are the **old editorial deliverable format** — no YAML front matter at all. They
were converted at publish time. So you cannot simply edit a draft and re-ingest.

**Work against the live rows.** Read what is published, swap the cover, write
back. `--update`, same slug, same URL — these pages are indexed and ranking.

## What to do

For each of the eight under `/artikel/hantaran-mas-kahwin/`:

1. **Choose a licensed photograph** from
   `docs/plans/aug-23-2026-session-01/drafts/images/` in the docs repo — 33 are
   downloaded and licence-verified in the asset register. Source more if none
   fit. Relevant candidates already present include the akad, hantaran dulang,
   gubahan kain, bersanding and kenduri sets.
2. **Reuse across the state articles is expected and fine.** The seven state
   pieces do not each need a unique photograph — mas kahwin is handed over at
   the akad, so an akad or hantaran image suits several. Say where you reused.
3. **Full credit chain:** real Malay alt text, a caption that teaches rather than
   describes, `credit`, `creditUrl`, `licensorName`, `licenseClass: S`.
4. **REMOVE the `kad-tajuk` card entirely — do NOT move it in-article.**
   Owner directive, 25 Aug: *"No i do not want a text card, it looks ugly. Find
   alternatives, no text card at all."* None as cover, none in the body. Leave
   the PNGs on disk unreferenced; do not delete the files, just do not put them
   on any page. The state data is already in markdown tables in the article body,
   so the reader loses nothing.
5. **Update the asset register** both directions.

## The rule that beats the count

**Never a culturally wrong image.** Malaysian Malay people, Malay wedding
context.

**There is no text-card fallback.** Every article gets a real photograph. Widen
the search rather than settling: Wikimedia Commons categories for Malay weddings,
Malaysian cultural events, songket, hantaran, kenduri, masjid interiors, henna,
traditional dress; Openverse; Pexels and Unsplash searched in Malay and for
adjacent subjects. **Reuse across the seven state articles is expected** — mas
kahwin is handed over at the akad, so an akad or hantaran photograph suits
several, and they do not need unique faces.

If after a real search you genuinely cannot find a correct photograph for a
specific article, **come back and name it and say what you tried.** Do not fall
back to a card and do not use a Western stock wedding.

## Rules

- **Record a precise undo before writing** — the eight slugs and their current
  cover values. Production has `pitr_enabled=false` and zero backups.
- **Do not change any URL. Do not edit article text.** Covers only.
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.
- Check `jsonb_typeof(content)` before and after — these eight are the rows that
  were double-encoded. Do not make it worse; if a prior run fixed it, keep it fixed.

## Prove it

- each of the eight URLs — status, **first request**;
- the `og:image` for each, showing it is no longer a `kad-tajuk` path;
- one rendered credit line quoted from live HTML;
- confirmation all eight URLs are unchanged.

## When done

Log to `docs/work-done/`, then write a **`## Retrospective`** — Stage 9,
mandatory. Four questions; **name the file that must change and edit it.** The
first publish run omitted this section and had to be sent back; do not repeat
that. The obvious candidate here: the covers directive arrived after eight
articles had already shipped, so what in the workflow should have caught that a
standard changed *after* publication and required a backfill?
