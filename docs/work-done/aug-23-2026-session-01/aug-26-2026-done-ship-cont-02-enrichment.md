# Done — CONT-02 shipped. 69 photographs reached a reader.

**Date:** 26 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-ship-cont-02-enrichment.md`
**Sprint 01, CONT-02 reopened.**

**The full log lives in the site repo, because that is where the production write
and the code changes are:**

> `hellokahwin-site` → `docs/work-done/2026-08-26-ship-cont-02-enrichment.md`
> undo: `…-UNDO/before.json` · evidence: `…-EVIDENCE/`
> (worktree `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`, branch
> `ianng89/pillars-ingest-redirects`)

## The headline

**23 published articles re-ingested. The 33 pillar articles went from 76 live
images to 145.** No URL changed, no publish date moved, no prose changed, and
none of the 178 internal links SEO-02 wrote yesterday was lost.

Zero text cards live, zero images on the 33 without a full credit chain, all 33
pages and all 10 navigation URLs HTTP 200.

**The brief's sample table was wrong in a way worth knowing about.** It read
`borang-nikah 4 live / 4 draft ✓`; the article was serving **one** image. It had
counted the sibling thumbnails the related-articles block puts on every page.
23 of 33 articles were behind, not 3.

## What changed in THIS repo

| Path | What |
|---|---|
| 25 of the 33 canonical drafts | `publishedAt:` added — front matter only, body byte-identical, value read out of production |
| `docs/asset-register/asset-register.csv` | 17 text-card rows retired `boleh-guna` → `jangan-guna`; 12 missing `digunakan_dalam` entries added; 46 cells, 794 rows in and out |
| `docs/asset-register/asset-register.csv.before-cont02-ship` | **new** — the copy taken before that edit |
| `docs/plans/…/aug-23-2026-workflow-content-production.md` | Stage 7 and Stage 9b — the retrospective edit |

**The publish-date trap is closed at the files.** All 33 drafts now carry
`publishedAt:`, so `--update --publish` can no longer restamp an indexed page
with today's date. It stays armed for every *new* draft — the file format
defaults it to absent.

## The retrospective, in one line

The workflow's ship check (Stage 9b) is written in git commands. For code that
chain ends at a reader; for content it forks, and git only sees the branch that
does not matter — committing a draft ships the *source*, and only an ingest
writes the *row*. Both git states report "done": untracked reads as noise (Stage
9b says so in as many words), and committed reads as shipped. `d4c4237` swept
these drafts into git at 09:03 this morning with all of CONT-02's photographs in
them, and `borang-nikah` was still serving one image.

Fixed with a fourth row in the Stage 9b table and a new checked-in command,
`pnpm --silent audit:drafts`, which exits 1 when a published article is behind
its draft. Both PASS and FAIL are demonstrated in the evidence folder.

## Still open for the CEO

`pnpm covers --set kad-tajuk,p1-body,p6-body` still regenerates all seventeen
banned text cards. CONT-02 raised this on 26 Ogos and parked it as a CEO
decision; it is outside this brief too, so it is raised a second time rather than
left to go quiet. The register and the style guide now both refuse these cards.
The generator still offers them with one command.

**Separately, and larger:** 619 images across the 28 legacy WordPress articles
carry no credit, no licence class and no licensor. Pre-existing, untouched, none
of it on the 33 — and the biggest open credit exposure on the domain. It needs a
brief of its own.
