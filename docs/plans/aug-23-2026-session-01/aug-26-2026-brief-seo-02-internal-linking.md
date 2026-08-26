# Brief — Head of SEO & Content — SEO-02: the internal linking pass

**Status:** APPROVED — executing. Sprint 01, item SEO-02, 3 points. The last item.
**Dispatch with `-PermissionMode bypassPermissions`.**
**Unblocked:** CONT-02 has finished editing the article files. They are yours now.

---

## Why this matters more than it did when I briefed it

SEO-01 came back with the finding that reframes this item. **Only 8 of 28
articles are indexed. Nineteen are discovered-but-never-crawled and one is
unknown to Google.** All 28 return 200 with no `robots` tag — nothing is blocked.

And the cause is a **crawl path**:

> The single indexed cluster is the one whose pillar Google has crawled, and that
> pillar was crawled because a legacy article already in the index —
> `mas-kahwin-ikut-negeri` — was re-parented into it. Googlebot had a path in.
> The other six pillars have no legacy article and no path in; two are not even
> *known* to Google, because the `/artikel` hub that links them was last crawled
> 23 Aug, before those links existed.

So internal linking is not tidiness here. **It is the mechanism by which twenty
uncrawled articles get discovered.** Treat every link you add as a road
Googlebot may take.

## Definition of done — verbatim from the sprint file

> A before/after table: articles with zero inbound internal links (orphans) —
> target 0; dead internal links — target 0; total links added. Every count
> produced by a command over the live pages or the database, not by reading
> drafts.

**By a command.** My own hand-count of images was wrong twice today because a
pattern missed `- file:` list entries. Count with something reproducible and show
the command.

## What to do

1. **Measure first.** Orphans and dead links across all 28 live articles, from
   the live pages or the database. That is the "before" column and it is the only
   honest baseline.
2. **Fix orphans by adding real links**, not by wiring everything to everything.
   A link earns its place when a reader following it lands somewhere genuinely
   relevant — the sibling article on the same question, the pillar above it.
   Link farms are visible to Google and to readers.
3. **Every link points at a PUBLISHED article.** The parser refuses dead links in
   the body as well as the front matter, so a bad link is a hard publish failure,
   not a style note. Take targets from the live sitemap, never from drafts.
4. **Say which links you expect to open a crawl path** to a currently uncrawled
   pillar. That is the hypothesis Sprint 02 scores.

## The five staged articles

Three C2.3 (`dulang-hantaran`, `gubahan-hantaran`, `sirih-junjung`) and two P3
(`walimatul-urus`, `skrip-pengacara-majlis-perkahwinan`) are written and ready to
ingest but **not yet published**. Link *to* them only if they are live by the time
you write; otherwise note them as planned links for the publishing run. Do not
create a dead link to an unpublished article.

## Rules

- No fabricated counts. Show the command.
- Do not edit article prose beyond the links themselves.
- Production writes are now permitted — RISK-01 closed and the database has a
  verified recovery point with a daily backup and a live alarm. **Record a
  precise undo before writing** regardless.
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** —
Stage 9, mandatory. Name the file that must change, and edit it.
