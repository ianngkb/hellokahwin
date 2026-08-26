# Brief — BMAD — Publish P1 and P6. Two more pillars go live tonight.

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.** Do not stop to ask.

---

## Everything is ready. This is the last step.

Eight articles, verified and board-cleared, with human photograph covers already
attached. I checked all three gates myself before writing this:

**Review board — all eight cleared.** Four blocks, every one corrected in-file:

| Article | Verdict |
|---|---|
| `borang-nikah.md` | PASS WITH FIXES — applied |
| `rukun-nikah.md` | PASS WITH FIXES — applied |
| `syarat-sah-nikah.md` | BLOCK — corrected, closed |
| `lafaz-taklik.md` | PASS WITH FIXES — applied |
| `C6-2-A1-harga-sewa-dewan-kahwin.md` | BLOCK — corrected, closed |
| `C6-2-A2-checklist-kahwin.md` | PASS WITH FIXES — applied |
| `C6-2-A3-pakej-dewan-kahwin.md` | BLOCK — corrected, closed |
| `C6-2-A4-bajet-kahwin.md` | BLOCK — corrected, closed |

**Covers — all eight are human photographs**, `licenseClass: S`, full credit
chain, files present on disk. Verified.

Drafts are in `docs/plans/aug-23-2026-session-01/drafts/` in the docs repo.

## The job

Ingest all eight into production and publish. **P1 → `/artikel/nikah-undang-undang/`,
P6 → `/artikel/venue-perancangan/`.**

## Six things that will bite you, all learned this week

1. **The path convention differs between the two sets.** P1 covers are
   `images/S-….jpg`; some P6 entries have used a leading `./`. The review board
   flagged this as probably wrong for one of them. **Settle it, use one
   convention, and say which.**
2. **`articles.content` is double-encoded on every row our pipeline has written.**
   `jsonb_typeof(content)` returns `string` on the eight live C2.4 rows and
   `object` on all 29 legacy rows. Cause: postgres.js serialising
   `${JSON.stringify(doc)}::jsonb` as a jsonb *string*. **Check whether this was
   fixed in a previous run. If not, FIX IT BEFORE ingesting these eight** — do
   not write eight more bad rows to save ten minutes.
3. **Internal links must resolve to PUBLISHED articles.** The parser refuses dead
   links in the body as well as the front matter. These eight cross-link to each
   other, so **ingest order matters** — work out the dependency order, or ingest
   then patch links in a second pass. A link to an unpublished sibling is a hard
   failure.
4. **`--revalidate-url` is mandatory** against a non-local database.
5. **Wait five minutes after publishing before inviting any crawl.** The Vercel
   edge holds pillar pages up to 300s; the ingest-time purge is not built yet.
6. **`pnpm --silent`, never `pnpm run`** for anything with a secret in argv — the
   runner's banner leaked the production database password into a transcript.

## Rules

- **Record a precise undo before writing** — the eight slugs, verbatim.
  Production has `pitr_enabled=false` and zero platform backups.
- Do not touch the eight live C2.4 articles.
- Do not change any existing URL.
- Do not edit article text. These passed a board; ingest what was approved.

## Prove it

Report as literal output:

- each of the eight new URLs — status code, **first request**;
- `/artikel/nikah-undang-undang` — status, and whether `noindex` is **gone**;
- `/artikel/venue-perancangan` — same;
- `sitemap.xml` URL count, which should rise from 47 to 57;
- the rendered credit line on at least one article, quoted from live HTML.

**Two pillars losing `noindex` is the outcome.** That takes the site from one
live pillar to three.

## When done

Log to `docs/work-done/`, then **write a `## Retrospective` section** — this is
now mandatory at the end of every workflow (Stage 9 of the content production
workflow, added today on owner directive). Four questions: what did we learn that
is not written down; **which document must change and who owns the edit** (name
the file); what did we do twice that we should never repeat; what did we nearly
ship and what caught it. **Then make those edits.** A retrospective that names a
document and does not change it has failed.
