# Brief - Sprint 02 - SEO-05: Titles: the one statistically real zero, and a seo_title drift audit

**Status:** APPROVED - executing.
**Repo:** C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/seo05-titles
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

v1 died on two counts: at 25–50 impressions expected clicks are 0.3–1.5 so zero is variance, and worse, the AVERAGED POSITIONS DESCRIBE NO ACTUAL QUERY — hantaran-tunang at 'average 9.8' is really 4 impressions at 10.2, 2 at 13.5, 1 at 33 and 1 at 56. v2 died because setiawangsa is not a real zero either: 104 impressions at position 9.0 predicts ~2.1 clicks, P(zero) ≈ 12%, and its SERP is DBKL's own booking portal at 1–2 with Instagram, Facebook, Waze and TikTok at 3–6, so realistic organic CTR is under 1%. The owner of this item put it sharply: the UX review applied a significance test and then exempted the one page it had already built a theory around. THE REAL ZERO IS `mas kahwin ikut negeri` — 388 impressions across THREE URLs of one redirect family (365 + 15 + 8), zero clicks, position 10–13, expected ~5.8 clicks, P(zero) ≈ 0.3%. It clears the bar by an order of magnitude and was missed because every single row reads as noise until you aggregate the family. Its cause is diagnosable, unlike setiawangsa's: CEO-verified against production, the title is 85 chars, asks a question instead of answering it, and carries no year — while the page's own H1 already reads 'Mas kahwin ikut negeri 2026: kadar minimum setiap negeri' and its meta already says 'RM22.50 hingga RM300'. A stale WordPress-era field disagreeing with its own page. SEPARATELY: our best page's title is 93 chars and Google prints it truncated, cutting away 'RM5,000' — the most clickable token in it. That is a TRUNCATION fix on a page already running 3.1% CTR at position 9.3, not an entity-match fix.

## Definition of done (verbatim - the bar, and it is NOT narrowed)

`mas kahwin ikut negeri` is item one, NOT setiawangsa. Five titles and metas rewritten and SHIPPED, each under 60 characters, each carrying the year, quoted from live HTML before and after. AUDIT EVERY seo_title FIELD FOR DRIFT against its H1 and meta — at least one is a stale pre-rewrite value and the total is unknown. TWO RULES land in ceo-memory.md AND the head-of-seo-content persona, not only in this item: (1) never trust an averaged position without the per-query breakdown; (2) AGGREGATE THE REDIRECT FAMILY BEFORE JUDGING A ZERO. Same class of error — a number that describes no real thing. State explicitly this is NOT funded as a conversion fix: sitewide CTR is 1.65% at average position 20, at or above the published curve. We have a position and volume problem; titles are cheap, not the bottleneck. OUT OF SCOPE with reasons: setiawangsa (P(zero) ≈ 12%, SERP owned by the operator's portal and social), dewan keramat (3 impressions), dewan mpaj tasik tambahan (1), hiasan-dekorasi/hantaran-kahwin (4). Hall-level entity-match is SEO-04's job — one 60-character listicle title cannot match seventeen distinct hall names and this item must not pretend otherwise.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward.

## Two rules this item exists to write down, not just to apply

The DoD requires both to land in `docs/boardroom/ceo-memory.md` **and** your own
persona at
`C:/Users/Ian Ng/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`
— edit the skillcentral original, not the deployed copy. The CEO runs
`install.sh` to re-wire.

1. **Never trust an averaged position without the per-query breakdown.**
   `hantaran-tunang` at "average 9.8" is really 4 impressions at 10.2, 2 at 13.5,
   1 at 33 and 1 at 56 — a mean describing no real query.
2. **Aggregate the redirect family before judging a zero.** `mas kahwin ikut
   negeri` hides across three URLs at 365 + 15 + 8 impressions; each row alone
   reads as dismissible noise.

## What the CEO already verified, so you do not redo it

- Live title is **85 chars**: "Mas Kahwin Ikut Negeri: Negeri Mana Paling Tinggi
  & Paling Rendah? | HelloKahwin" — no year, and it asks instead of answering.
- The page's own **H1 already reads** "Mas kahwin ikut negeri 2026: kadar minimum
  setiap negeri" and its **meta already says** "RM22.50 hingga RM300". The title
  is a stale field disagreeing with its own page. **Audit how many others have
  drifted the same way** — the count is unknown and is part of the DoD.
- Titles are cheap, not the bottleneck: sitewide CTR is **1.65% at average
  position 20**, at or above the published curve. Do not fund this as a
  conversion fix or promise one.

## Live state — all CEO-verified today, do not re-derive it

- **RISK-06 shipped.** `stale-while-revalidate` capped at 3000s, down from
  31535400 (365 days). Pages are no longer served from a year-old cache.
- **RISK-04 shipped.** Ingest resubmits the sitemap to GSC. Google re-fetched it
  (73 → 78 URLs) and **all four articles that were "unknown to Google" that
  morning left that state within eight hours** — two already indexed with
  breadcrumbs.
- **SEO-06 shipped.** `hantaran-kahwin` and `hantaran-tunang` are re-filed under
  `/artikel/hantaran-mas-kahwin/`; old URLs 308 in one hop, new URLs 200. Pillar
  empty states fell 3 → 1.
- **CONT-09 shipped.** 19 covers re-selected; the cover standard is live.
- **PLAT-05 shipped**, merged to `main`. **PLAT-07 shipped** — the sprint CLI
  reads back `why` and `retro`, and `status-board.py` is project-scoped.

## What SHIPPED means, and how to check it without a false negative

**Committed is not shipped.** Three Sprint 01 items were marked done on an
unmerged branch and the owner found all three by asking.

- **Verify by CONTENT on the default branch, never by ancestry.**
  `git merge-base --is-ancestor <branch> origin/master` **returns false forever
  for a squash-merged branch** — squashing makes a new commit, so the branch tip
  never becomes an ancestor. The CEO hit this today and briefly called shipped
  work unshipped. Use `git cat-file -e origin/master:<a file your work added>`.
- **Enumerate working trees, never recall them**: `git worktree list` and
  `orca worktree list`. A sprint was closed on "both repos clean" having checked
  two of three, and the third held every production rollback script.
- **Stay on the branch you were given.** Other agents share these trees; a
  `git checkout` relocates their HEAD silently. That happened today.
- **A status code cannot prove a deployment on an auth-gated app.** Quote content
  only the real page contains, plus a negative control — or say plainly that you
  cannot verify from outside and hand over a URL.

## Concurrency — you are not alone in this repo

Six other agents are working right now, several in sibling worktrees of the same
repository. **You have your own worktree; stay inside it.** If your work needs a
file another item owns, say so and stop rather than racing — ingest and config
writes are whole-file, so the loser's work vanishes silently.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so and name what would
verify it — never present an inference as a measurement.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship and
what caught it. **Then make the edit.**
