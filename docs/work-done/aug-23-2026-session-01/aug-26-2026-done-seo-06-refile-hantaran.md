# Done: SEO-06, the Hantaran pillar lists the two articles it was calling missing

**Date:** 26 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-seo-06.md`
**By:** head-of-seo-content
**Sprint 02, item SEO-06, 2 points.**

**Production was written.** Two articles re-parented into `hantaran-mas-kahwin` in one guarded transaction at 14:47:51 UTC, both caches dropped, every DoD line measured live. Undo recorded and verified before the write.

The full log, evidence and undo live in the SITE repo, branch `ianng89/pillars-ingest-redirects`:

- `docs/work-done/2026-08-26-seo-06-refile-hantaran.md` (claim + evidence + live link per DoD line, and the retrospective)
- `docs/work-done/2026-08-26-seo-06-refile-hantaran-EVIDENCE/`
- `docs/work-done/2026-08-26-seo-06-refile-hantaran-UNDO/`

## DoD, line by line

| DoD line | Result | Where measured |
|---|---|---|
| Re-filed into hantaran-mas-kahwin | Yes. Primary = P2, linked to pillar + own cluster (C2.1 / C2.2) | `EVIDENCE/01-refile-commit.txt` |
| Which redirect mechanism applies | Route self-heal, as CONT-04 said. Both redirect tables 0 rows before and after; none written | `page.tsx:552`, `read-state.mjs` |
| ONE hop to 200 | Old URL 308 to new, new 200. 24 of 24 samples over 80 s | `EVIDENCE/05-hop-samples.txt` |
| Pillar shows them as real entries | Both linked under their cluster headings | `EVIDENCE/04-live-after.txt` |
| Empty states at most one | One left (duit hantaran, C2.5) | same |
| Old URLs still resolve | Yes, including the legacy `/hantaran-kahwin/` and `/hantaran-tunang/` permalinks, one hop each | same |
| Sitemap reflects the move | New URLs listed, old gone, `lastmod` = the write, 78 URLs before and after, resubmitted to GSC 14:49 UTC | same, `00-gsc-before.json` |
| GSC before recorded | kahwin: pos 6.5, 4 impr. tunang: pos 10.3, 58 impr. Both indexed, last crawl 23 Aug | `00-gsc-before.json` |
| GSC after recorded | New URLs: "unknown to Google" / "Discovered, not indexed" at 14:49 UTC. Ranking after the move is not measurable yet; rerun the pages query on or after 2026-08-30 | `00-gsc-before.json` |
| Coordinate with UX-03 | UX-03 is `todo`, BMAD's live dispatch is PLAT-07, no rendering file was edited | site log, Compliance |

Live: https://hellokahwin.com/artikel/hantaran-mas-kahwin

CONT-05 and CONT-07 are unblocked. Seed articles:
https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin and
https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang

## Retrospective (full text in the site log)

Learned: the admin editor does not purge the Vercel edge; only the ingest CLI calls `purgeVercelEdge`. The CEO record's "must go through the admin editor" precondition was wrong. A re-file needs both cache drops, and the new URL must be in the edge purge set, because a cached pre-move 308 on it forms a loop with the fresh old-to-new 308. Seen once, inside the purge propagation window, then 24 of 24 clean.

File changed: `docs/boardroom/ceo-memory.md`, "URL structure and re-parenting", the preconditions bullet. Edited in this item. For engineering, unedited: `pathsInvalidatedByIngest` is incomplete for a re-file; a `scripts/refile-article.mts` is a two-point item.

Did twice: counted a string on the rendered page (it appears in the markup and in the flight payload). CONT-02 wrote this rule yesterday. Measure the element.

Nearly shipped: a redirect loop I created by probing the new URLs before the move. Caught because the new URLs were in the purge list and the hop trace sampled twice.
