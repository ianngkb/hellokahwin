# Brief — Head of SEO & Content — SEO-01: indexing push and the baseline

**Status:** APPROVED — executing. Sprint 01, item SEO-01, 2 points.
**Dispatch with `-PermissionMode bypassPermissions`** (needs GSC and cross-repo reads).

---

## Why now

Twenty-eight articles went live across seven pillars in two days. The sitemap is
73 URLs. **Google has seen almost none of the new ones**, and post-migration
consolidation from 21 Aug is still in flight — the old WordPress URLs still carry
most of the impressions.

Without a baseline captured now, Sprint 02 has nothing to score against and every
claim about whether this worked becomes an argument.

## Definition of done — verbatim from the sprint file

> Sitemap resubmitted, indexing requested where it helps, and a GSC baseline
> captured for all 28 articles so Sprint 02 has something to score against. The
> report must union old and new URLs.

**That last clause is not optional and it is the easiest thing to get wrong.**
Google is still serving the old paths: `/mas-kahwin-ikut-negeri/` carried 44
impressions at position 9.6 against 5 on the new `/artikel/…` path;
`/dewan-kahwin/` carried 132 impressions and five of our eight clicks. **A
new-URLs-only report reads as a collapse that did not happen.**

## The 28 live articles

Seven pillars, all indexable: `nikah-undang-undang` (4), `hantaran-mas-kahwin`
(8), `ucapan-doa` (3), `busana-pengantin` (3), `pelamin-kad-cenderahati` (3),
`venue-perancangan` (4), `sebelum-nikah` (3).

Take the exact URLs from `https://hellokahwin.com/sitemap.xml`, not from a drafts
folder — drafts and production have diverged before.

## What I want in the baseline

Per article: impressions, clicks, CTR, average position — and **explicitly zero
where that is the truth.** An absent row and a zero row mean different things
thirty days from now. Note the capture date.

Note which articles Google has **not indexed at all** yet. That is the number
Sprint 02 measures against, and it is more useful than the impressions.

Then, one line each: which articles you expect to move first, and why. The C2.4
cluster was already at position 10–11 on a single legacy post before any of this
published — that is the obvious candidate, but argue it rather than assume it.

## Rules

- No fabricated metrics. If GSC cannot see something, say it cannot.
- GSC runs 1–2 days behind; today will read as zero. That is lag, not a finding.
- No production database writes in this brief.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** —
Stage 9, mandatory. Four questions, and **name the file that must change, then
edit it.**
